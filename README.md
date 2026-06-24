2026 年卒業制作

docker compose up --build

docker compose down --rmi all --volumes --remove-orphans
docker system prune -a --volumes -f

npm run build
-react の静的ファイル作成  
--作成されたフォルダの中身のみサーバーに移す

SVG を使用する場合は SVGR で実装してください

#ロリポップデプロイ手順

1.  frontend ディレクトリに移動
2.      cd TABI
        npm run build
        cp -r api dist/
    を実行
3.  dist フォルダ内の全ファイルを /test/ にアップロード