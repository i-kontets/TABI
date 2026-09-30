"""503原因調査から手動起動する隔離再現。外部ネットワーク・本番DBは使わない。"""
import json
import subprocess
import tempfile
import time
import uuid
from pathlib import Path


# 2026-09-30の読み取りで確認した親設定。秘密情報は含まない。
PARENT = r"""<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-l
RewriteRule . /index.html [L]
</IfModule>
"""
ROOT = """Options -MultiViews
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /TABI/
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]
</IfModule>
"""

# コンテナ内のloopbackだけへ送信し、登録とエラーページの実行を別々に数える。
CLIENT = r'''
foreach (['/tmp/register.trace','/tmp/error.trace'] as $f) if (is_file($f)) unlink($f);
$ctx=stream_context_create(['http'=>['method'=>$argv[2], 'ignore_errors'=>true,
    'timeout'=>3, 'header'=>"Content-Type: application/json\r\n",
    'content'=>$argv[2]==='POST'?'{}':'']]);
$body=file_get_contents('http://127.0.0.1'.$argv[1],false,$ctx);
preg_match('/\s(\d{3})\s/', $http_response_header[0], $m);
echo json_encode(['status'=>(int)$m[1], 'registered'=>is_file('/tmp/register.trace'),
    'error_document'=>is_file('/tmp/error.trace'), 'canonical'=>$body==='canonical']);
'''


def main():
    image = 'tabi-apache:latest'
    # 既存のローカルイメージだけを使い、pullや本番コンテナ操作をしない。
    subprocess.run(['docker', 'image', 'inspect', image], check=True, stdout=subprocess.DEVNULL)
    name = 'tabi-503-diagnosis-' + uuid.uuid4().hex[:8]
    repo = Path(__file__).resolve().parents[3]
    maintenance = (repo / 'deployment/notifications/api.htaccess.maintenance').read_text()
    start = maintenance.index('    # BEGIN TABI_ADMIN_WRITE_MAINTENANCE')
    end = maintenance.index('    # END TABI_ADMIN_WRITE_MAINTENANCE')
    end = maintenance.index('\n', end) + 1
    active = maintenance[:start] + maintenance[end:]
    started = False
    with tempfile.TemporaryDirectory(prefix='tabi-503-isolated-') as folder:
        root = Path(folder)
        for rel, marker in [('TABI/api/Admin', 'canonical'), ('TABI/api/api/Admin', 'duplicate')]:
            target = root / rel
            target.mkdir(parents=True)
            # お知らせ登録PHPの代わり。DBや通知送信はせず、一時領域へ到達だけを残す。
            (target / 'index.php').write_text('<?php file_put_contents("/tmp/register.trace", "reached"); echo "' + marker + '";')
        (root / '.htaccess').write_text(PARENT)
        (root / 'TABI/.htaccess').write_text(ROOT)
        api_rules = root / 'TABI/api/.htaccess'
        api_rules.write_text(maintenance)
        (root / 'TABI/index.html').write_text('isolated SPA')
        # エラー表示用PHPが動いても、登録PHPが動いたことにはならないと確かめる。
        (root / 'error.php').write_text('<?php file_put_contents("/tmp/error.trace", "displayed"); echo "isolated error page";')
        (root / 'test.conf').write_text('<Directory /var/www/html>\nAllowOverride All\nRequire all granted\n</Directory>\nLogLevel warn rewrite:trace3\n')
        try:
            subprocess.run(['docker', 'run', '-d', '--rm', '--network', 'none', '--name', name,
                            '-v', folder + ':/var/www/html:ro', image, 'sh', '-c',
                            'a2enmod rewrite >/dev/null && cp /var/www/html/test.conf /etc/apache2/conf-enabled/diagnosis.conf && exec apache2-foreground'],
                           check=True, stdout=subprocess.DEVNULL)
            started = True
            for _ in range(30):
                ready = subprocess.run(['docker', 'exec', name, 'php', '-r',
                                        '$s=@fsockopen("127.0.0.1",80);exit($s?0:1);'], capture_output=True)
                if ready.returncode == 0:
                    break
                time.sleep(0.1)
            else:
                raise RuntimeError('隔離Apacheを起動できませんでした')

            checks = 0
            # 変えるのは隔離コピーだけ。停止あり→表示処理追加→停止だけなしの順で比較する。
            for phase, rules in [('stop', maintenance), ('stop_with_error_document', maintenance + '\nErrorDocument 503 /error.php\n'), ('no_stop', active + '\nErrorDocument 503 /error.php\n')]:
                api_rules.write_text(rules)
                for path in ['/TABI/api/Admin/index.php?resource=notices', '/TABI/api/api/Admin/index.php?resource=notices']:
                    for method in ['GET', 'POST']:
                        actual = json.loads(subprocess.check_output(['docker', 'exec', name, 'php', '-r', CLIENT, '--', path, method], text=True))
                        blocked = phase != 'no_stop' and method == 'POST'
                        expected = {'status': 503 if blocked else 200, 'registered': not blocked,
                                    'error_document': blocked and phase == 'stop_with_error_document', 'canonical': not blocked}
                        if actual != expected:
                            raise AssertionError((phase, path, method, actual, expected))
                        checks += 1
                        print(json.dumps({'phase': phase, 'path': path, 'method': method, **actual}))
            logs = subprocess.run(['docker', 'logs', name], text=True, capture_output=True, check=True)
            trace_count = (logs.stdout + logs.stderr).count('forcing responsecode 503')
            if not trace_count:
                raise AssertionError('停止Rewriteの503決定traceを確認できませんでした')
            print(f'PASS: {checks} comparisons; rewrite forcing responsecode 503: {trace_count}; external network disabled')
        finally:
            if started:
                subprocess.run(['docker', 'stop', name], check=True, stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    main()
