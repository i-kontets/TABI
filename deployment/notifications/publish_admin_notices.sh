#!/bin/sh
# ロリポップのcron設定画面から、ファイルパスを指定して起動する入口です。
# PHPファイルの直接登録ではCGI版になる場合があり、CLIの実行条件を満たせません。
# 環境をawsへ固定してCLI版PHPを呼び、既存の公開処理と時刻判定を再利用します。
# 配置先候補: web/TABI/api/Notifications/cli/publish_admin_notices.sh
# このファイルの配備だけではcron登録・自動送信開始にはなりません。
set -eu
umask 077

# 外部から時刻等を渡して本番配信条件を変えないよう、引数は受け付けません。
if [ "$#" -ne 0 ]; then
    echo '通知公開の定期起動には引数を指定できません。' >&2
    exit 64
fi

tabi_php='/usr/local/bin/php8.3'
tabi_publisher='/home/users/1/mond.jp-genshin/web/TABI/api/Notifications/cli/publish_admin_notices.php'
tabi_log='/home/users/1/mond.jp-genshin/private/TABI/notification-publisher.log'

# 配備不足の場合は別の実行環境へ切り替えず終了し、誤ったDBへの接続を避けます。
if [ ! -x "$tabi_php" ] || [ ! -r "$tabi_publisher" ] || [ ! -d "$(dirname "$tabi_log")" ]; then
    echo '通知公開の実行ファイルまたは非公開ログ領域を確認してください。' >&2
    exit 78
fi

# ホスト名を持たないcronでも本番設定を選びます。秘密値はここへ記述しません。
# 出力はWeb公開外へ保存します。終了コードは既存PHPの結果をそのまま返します。
APP_ENV=aws
export APP_ENV
exec "$tabi_php" "$tabi_publisher" >> "$tabi_log" 2>&1
