"""通知配備前の確認から起動するApacheの隔離テスト。本番ファイル・DBは使用しない。"""
import json
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

BASE_RULE = '''Options -MultiViews
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /TABI/
{maintenance}
    RewriteCond %{{REQUEST_FILENAME}} -f [OR]
    RewriteCond %{{REQUEST_FILENAME}} -d
    RewriteRule ^ - [L]
    RewriteRule ^ index.html [L]
</IfModule>
'''
DEPLOYMENT = Path(__file__).resolve().parents[3] / 'deployment/notifications'


def status(path, method):
    request = urllib.request.Request('http://127.0.0.1:18096' + path, method=method)
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def main():
    name = 'tabi-rewrite-test-' + uuid.uuid4().hex[:8]
    image = json.loads(subprocess.check_output(['docker', 'inspect', 'tabi-apache-1']))[0]['Config']['Image']
    started = False
    try:
        with tempfile.TemporaryDirectory(prefix='tabi-rewrite-test-') as directory:
            root = Path(directory)
            for rel in ['TABI/api/Admin', 'TABI/api/api/Admin', 'TABI/api/Notifications']:
                (root / rel).mkdir(parents=True, exist_ok=True)
                # 書き込みを一切行わないダミーAPIで、Rewriteの通過・遮断だけを検証する。
                marker = 'canonical' if rel == 'TABI/api/Admin' else 'other'
                (root / rel / 'index.php').write_text('<?php /* Rewrite検証用。DBへ接続しません。 */ http_response_code(200); echo "' + marker + '";')
            (root / '.htaccess').write_text(BASE_RULE.format(maintenance=''))
            (root / 'TABI/.htaccess').write_text(BASE_RULE.format(maintenance=''))
            (root / 'TABI/api/.htaccess').write_text((DEPLOYMENT / 'api.htaccess.maintenance').read_text())
            (root / 'TABI/index.html').write_text('SPA')
            # 標準Apacheイメージで、本番と同じディレクトリ別Rewriteを有効にする。
            conf = root / 'test.conf'
            conf.write_text('<Directory /var/www/html>\nAllowOverride All\nRequire all granted\n</Directory>\n')
            subprocess.run(['docker', 'run', '-d', '--rm', '--name', name, '-p', '127.0.0.1:18096:80', '-v', directory + ':/var/www/html:ro', image, 'sh', '-c', 'a2enmod rewrite >/dev/null && cp /var/www/html/test.conf /etc/apache2/conf-enabled/tabi-test.conf && exec apache2-foreground'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            started = True
            for _ in range(30):
                try:
                    if status('/TABI/index.html', 'GET') == 200:
                        break
                except (OSError, urllib.error.URLError):
                    pass
                time.sleep(0.1)
            count = 0
            for path in ['/TABI/api/Admin/index.php', '/TABI/api/api/Admin/index.php']:
                for method in ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'PUT', 'DELETE']:
                    expected = 200 if method in ['GET', 'HEAD', 'OPTIONS'] else 503
                    actual = status(path, method)
                    if actual != expected:
                        raise RuntimeError(f'{method} {path}: expected {expected}, got {actual}')
                    count += 1
            for path, method in [('/TABI/api/Notifications/index.php', 'PATCH'), ('/TABI/notifications', 'GET'), ('/TABI/admin/notices', 'GET')]:
                if status(path, method) != 200:
                    raise RuntimeError('管理API以外のルーティングが変わっています。')
                count += 1
            # 停止ブロックだけを取り除き、元のRewriteでPOSTが再び通ることを確認する。
            (root / 'TABI/api/.htaccess').write_text((DEPLOYMENT / 'api.htaccess.active').read_text())
            for path in ['/TABI/api/Admin/index.php', '/TABI/api/api/Admin/index.php']:
                if status(path, 'POST') != 200:
                    raise RuntimeError('停止解除後も書き込みが遮断されています。')
                count += 1
            for path in ['/TABI/api/api/Admin/index.php', '/TABI/api/api/Admin/index.php/extra', '/TABI/api/api/Admin/']:
                with urllib.request.urlopen('http://127.0.0.1:18096' + path, timeout=3) as response:
                    if response.read() != b'canonical':
                        raise RuntimeError('重複URLが通常の管理APIへ統一されていません。')
                count += 1
            print(f'Apache Rewrite {count} checks PASS（本番変更なし）')
    finally:
        if started:
            subprocess.run(['docker', 'stop', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


if __name__ == '__main__':
    main()
