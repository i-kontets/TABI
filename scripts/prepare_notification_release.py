"""通知の本番切り替え準備から使用するローカル専用の配備物作成ツール。

許可リストだけを梱包し、接続設定・テスト・.htaccessの誤上書きを防ぐ。
本番への接続・アップロード・SQL実行は行わない。
"""
from pathlib import Path
import hashlib
import json
import tarfile

ROOT = Path(__file__).resolve().parents[1]
PHP_FILES = [
    'api/Admin/index.php', 'api/Admin/includes/bootstrap.php',
    'api/Admin/handlers/post.php', 'api/Admin/handlers/patch.php',
    'api/Admin/repositories/admin_fetchers.php', 'api/Admin/services/realtime.php',
    'api/Admin/services/notices.php', 'api/Notifications/Common.php',
    'api/Notifications/List.php', 'api/Notifications/MarkRead.php',
    'api/Notifications/MarkAllRead.php',
    'api/Notifications/Service/NotificationRepository.php',
    'api/Notifications/Service/RdsShutdownWarning.php',
    'api/Notifications/cli/publish_admin_notices.php', 'api/config/serviceSchedule.php',
    'api/auth/WebSocketAuth.php', 'api/auth/WebSocketToken.php',
]


def main():
    if not (ROOT / 'dist/index.html').is_file():
        raise SystemExit('先に npm run build を実行してください。')
    output = ROOT / 'dist/notification-release'
    output.mkdir(exist_ok=True)
    files = [(name, ROOT / name) for name in PHP_FILES]
    files += [('index.html', ROOT / 'dist/index.html')]
    files += [(str(p.relative_to(ROOT / 'dist')), p) for p in sorted((ROOT / 'dist/assets').rglob('*')) if p.is_file()]
    # 配備側はこの一覧を使って旧版を退避する。旧ハッシュ付きassetの削除指示は含めない。
    manifest = [{'path': name, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for name, path in files]
    manifest_path = output / 'manifest.json'
    manifest_path.write_text(json.dumps({'phpCount': len(PHP_FILES), 'files': manifest}, ensure_ascii=False, indent=2) + '\n')
    archive = output / 'TABI-notifications.tar.gz'
    with tarfile.open(archive, 'w:gz') as tar:
        for name, path in files:
            tar.add(path, arcname='payload/' + name, recursive=False)
        tar.add(manifest_path, arcname='manifest.json')
        # SQLはレビュー用に同梱するだけで、配備PHPとは別の階層へ置く。
        migration = ROOT / 'database/migrations/20260928_link_admin_notice_notifications.sql'
        tar.add(migration, arcname='review/' + migration.name)
        for candidate in sorted((ROOT / 'deployment/notifications').glob('api.htaccess.*')):
            tar.add(candidate, arcname='review/' + candidate.name)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (output / 'SHA256SUMS').write_text(digest + '  ' + archive.name + '\n')
    print(f'PHP {len(PHP_FILES)} files; frontend {len(files) - len(PHP_FILES)} files')
    print(archive)
    print('配備本体から秘密設定・.htaccess・cron・テストを除外しました。.htaccess案はreview内だけにあります。旧assetは削除しません。')


if __name__ == '__main__':
    main()
