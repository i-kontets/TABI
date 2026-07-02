
# AWS S3 接続・画像アップロード手順まとめ

このドキュメントは、TABIプロジェクトで **ロリポップ上のPHP APIから AWS S3 に画像を保存し、React側で表示するために行った作業** をまとめたものです。

担当者以外でも、現在の状態・設定理由・API仕様・React側の使い方が分かることを目的にしています。

---

## 1. 今回の目的

TABIでは、ユーザーが旅行中に撮影した写真やアルバム画像を保存します。

画像本体をDBに保存すると容量がすぐに増えるため、画像本体はS3に保存し、RDSには画像の保存先だけを保存します。

```txt
S3:
  画像本体を保存

RDS:
  S3キー、キャプション、撮影日時などのメタ情報を保存
```

---

## 2. 現在の構成

```txt
React
  ↓ 画像アップロード
ロリポップ PHP API
  ↓
AWS S3
  └─ 画像本体

ロリポップ PHP API
  ↓
AWS RDS MySQL
  └─ photosテーブルにS3キー保存
```

画像表示時:

```txt
React
  ↓
Photos/List.php
  ↓
RDSからphotos取得
  ↓
S3キーから署名付きURLを発行
  ↓
Reactが image_url を img src に指定して表示
```

---

## 3. 現在完了していること

```txt
S3バケット作成: OK
IAMユーザー作成: OK
S3用IAMポリシー作成・付与: OK
アクセスキー発行: OK
ロリポップ env.php にS3情報追加: OK
AWS SDK for PHP導入: OK
PHPからS3アップロード確認: OK
Photos/Upload.php 作成: OK
Reactから画像アップロード確認: OK
RDS photosテーブル保存確認: OK
Photos/List.phpで画像一覧取得: OK
Reactで画像表示確認: OK
```

---

## 4. S3バケット設定

作成したバケット:

```txt
tabi-app-uploads-bell
```

リージョン:

```txt
アジアパシフィック 東京 ap-northeast-1
```

主な設定:

```txt
バケットタイプ: 汎用
オブジェクト所有者: ACL無効
パブリックアクセス: すべてブロック ON
バージョニング: 無効
暗号化: SSE-S3
オブジェクトロック: 無効
```

---

## 5. なぜパブリックアクセスをブロックしているのか

S3に保存する画像には、ユーザーが撮影した旅行写真が含まれます。

バケットを公開すると、URLを知っている人が画像を見られる危険があります。

そのため、S3バケットは非公開にしています。

```txt
S3バケット:
  非公開

画像表示:
  PHP APIが署名付きURLを発行
```

署名付きURLは一時的にだけ有効なURLです。

現在の `Photos/List.php` では、画像表示用に署名付きURLを作成してReactに返しています。

---

## 6. IAMユーザー

S3操作用にIAMユーザーを作成しました。

```txt
IAMユーザー名: tabi-s3-user
```

用途:

```txt
ロリポップ上のPHP APIからS3へアップロード・取得・削除するため
```

AWS管理画面にログインするためのユーザーではありません。

---

## 7. IAMポリシー

ポリシー名:

```txt
tabi-s3-policy
```

ポリシー内容:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TabiS3ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::tabi-app-uploads-bell/*"
    },
    {
      "Sid": "TabiS3ListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::tabi-app-uploads-bell"
    }
  ]
}
```

このポリシーでは、TABI用バケットだけに権限を絞っています。

```txt
許可している操作:
  PutObject   アップロード
  GetObject   取得
  DeleteObject 削除
  ListBucket  一覧取得

対象:
  tabi-app-uploads-bell のみ
```

---

## 8. アクセスキー

IAMユーザー `tabi-s3-user` でアクセスキーを作成しました。

用途選択では以下を選びました。

```txt
AWS の外部で実行されるアプリケーション
```

理由:

```txt
ロリポップはAWSの外部サービスであり、そこで動くPHPからS3にアクセスするため
```

アクセスキーは以下2つです。

```txt
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

このドキュメントにはキーを記載しないでください。

---

## 9. ロリポップ側のS3設定

以下の2つのenvファイルにS3設定を追加しています。

```txt
/home/users/1/mond.jp-genshin/web/TABI/api/config/env.php
/home/users/1/mond.jp-genshin/web/TABI/api/api/config/env.php
```

必要なキー:

```php
'AWS_ACCESS_KEY_ID' => 'アクセスキーID',
'AWS_SECRET_ACCESS_KEY' => 'シークレットアクセスキー',
'AWS_DEFAULT_REGION' => 'ap-northeast-1',
'AWS_BUCKET' => 'tabi-app-uploads-bell',
```

DB設定と合わせると、`env.php` は以下のような形になります。

```php
<?php
return [
    'DB_HOST' => 'tabi-rds.crmq0gc46bxg.ap-northeast-1.rds.amazonaws.com',
    'DB_NAME' => 'tabidb',
    'DB_USER' => 'admin',
    'DB_PASSWORD' => 'RDSのパスワード',

    'AWS_ACCESS_KEY_ID' => 'アクセスキーID',
    'AWS_SECRET_ACCESS_KEY' => 'シークレットアクセスキー',
    'AWS_DEFAULT_REGION' => 'ap-northeast-1',
    'AWS_BUCKET' => 'tabi-app-uploads-bell',
];
```

注意:

```txt
env.phpはGitに上げない
スクショでキーやパスワードを見せない
.envバックアップやSQLファイルを公開フォルダに置かない
```

---

## 10. configフォルダの直接アクセス拒否

`env.php` にはAWSキーとDBパスワードが入るため、直接ブラウザから見られないようにしています。

設置済みファイル:

```txt
api/config/.htaccess
api/api/config/.htaccess
```

中身:

```apache
Require all denied
```

作成コマンド:

```bash
cat > config/.htaccess <<'HTACCESS'
Require all denied
HTACCESS

cat > api/config/.htaccess <<'HTACCESS'
Require all denied
HTACCESS
```

---

## 11. AWS SDK for PHP

S3操作にはAWS SDK for PHPを使っています。

ロリポップでは `php` にパスが通っていなかったため、先にPATHを設定しました。

```bash
export PATH=/usr/local/php/8.3/bin:$PATH
```

Composer確認:

```bash
composer --version
```

AWS SDKインストール:

```bash
composer require aws/aws-sdk-php
```

インストール後にできたもの:

```txt
vendor/
composer.json
composer.lock
```

API側では以下を読み込んで使います。

```php
require_once __DIR__ . '/../vendor/autoload.php';
```

---

## 12. S3接続テスト

接続テスト用に `s3-test.php` を作成し、S3へテキストファイルをアップロードしました。

アップロード先:

```txt
tabi-app-uploads-bell/test/connection-20260701-185420.txt
```

S3画面でファイル作成を確認済みです。

テスト完了後、`s3-test.php` は公開ディレクトリから退避しました。

退避先例:

```txt
~/backup/s3-test.php.bak
```

---

## 13. S3キー設計

S3上の画像保存キーは以下の形式にしています。

```txt
albums/{album_id}/photos/YYYY/MM/DD/{ランダム文字列}.{拡張子}
```

例:

```txt
albums/1/photos/2026/07/01/d06f7559347d7c0b63bc0916e71038d0.png
```

このキーをRDSの `photos.file_url` に保存します。

```txt
photos.file_url = albums/1/photos/2026/07/01/d06f7559347d7c0b63bc0916e71038d0.png
```

注意:

```txt
署名付きURLはDBに保存しない
S3キーだけDBに保存する
```

理由:

```txt
署名付きURLは期限付きの一時URLのため、DBに保存しても時間が経つと使えなくなる
```

---

## 14. photosテーブル

現在の `photos` テーブル:

```txt
photo_id     bigint    PRIMARY KEY auto_increment
album_id     bigint    nullable
uploaded_by  bigint    nullable
file_url     text      nullable
caption      text      nullable
shot_at      datetime  nullable
```

S3対応では `file_url` にS3キーを保存します。

既存データには `https://images.unsplash.com/...` のような外部URLもあります。

そのため、一覧APIでは以下のように分岐しています。

```txt
file_url が http または https で始まる:
  外部URLとしてそのまま image_url に入れる

file_url が S3キー:
  S3の署名付きURLを作成して image_url に入れる
```

---

## 15. 画像アップロードAPI

作成したAPI:

```txt
https://genshin.mond.jp/TABI/api/Photos/Upload.php
```

ロリポップ上のファイル:

```txt
/home/users/1/mond.jp-genshin/web/TABI/api/Photos/Upload.php
```

役割:

```txt
Reactから画像ファイルを受け取る
画像形式とサイズをチェックする
S3へアップロードする
RDSのphotosテーブルに保存する
成功結果をJSONで返す
```

---

## 16. Upload.php のPOST仕様

メソッド:

```txt
POST
```

送信形式:

```txt
multipart/form-data
```

送る項目:

```txt
image       画像ファイル
album_id    アルバムID
user_id     ユーザーID
caption     任意
shot_at     任意
```

`uploaded_by` でも受け取れるようにしてあります。

```txt
uploaded_by または user_id
```

---

## 17. Upload.php の制限

対応画像形式:

```txt
image/jpeg
image/png
image/webp
```

最大サイズ:

```txt
10MB
```

S3キー形式:

```txt
albums/{album_id}/photos/YYYY/MM/DD/{random}.{jpg|png|webp}
```

---

## 18. curlでアップロードテスト

テスト用画像を作成:

```bash
/usr/local/php/8.3/bin/php -r 'file_put_contents("/tmp/tabi-test.png", base64_decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="));'
```

アップロードテスト:

```bash
curl -X POST \
  -F "image=@/tmp/tabi-test.png;type=image/png" \
  -F "album_id=1" \
  -F "user_id=1" \
  -F "caption=S3アップロードテスト" \
  -F "shot_at=2026-07-01 19:00:00" \
  "https://genshin.mond.jp/TABI/api/Photos/Upload.php"
```

成功結果例:

```json
{
  "success": true,
  "message": "画像アップロード成功",
  "photo": {
    "photo_id": 5,
    "album_id": 1,
    "uploaded_by": 1,
    "file_url": "albums/1/photos/2026/07/01/d06f7559347d7c0b63bc0916e71038d0.png",
    "caption": "S3アップロードテスト",
    "shot_at": "2026-07-01 19:00:00"
  }
}
```

---

## 19. RDS保存確認

アップロード後にRDSで確認:

```bash
mysql -h tabi-rds.crmq0gc46bxg.ap-northeast-1.rds.amazonaws.com -P 3306 -u admin -p --ssl-mode=REQUIRED --ssl-ca=/home/users/1/mond.jp-genshin/global-bundle.pem -e "USE tabidb; SELECT photo_id, album_id, uploaded_by, file_url, caption, shot_at FROM photos ORDER BY photo_id DESC LIMIT 5;"
```

確認できたレコード例:

```txt
photo_id: 5
album_id: 1
uploaded_by: 1
file_url: albums/1/photos/2026/07/01/d06f7559347d7c0b63bc0916e71038d0.png
caption: S3アップロードテスト
shot_at: 2026-07-01 19:00:00
```

---

## 20. 画像一覧取得API

作成したAPI:

```txt
https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=1
```

ロリポップ上のファイル:

```txt
/home/users/1/mond.jp-genshin/web/TABI/api/Photos/List.php
```

役割:

```txt
RDSのphotosから写真一覧を取得
外部URLならそのまま返す
S3キーなら署名付きURLを作成
Reactで使いやすいように image_url を返す
```

---

## 21. List.php のGET仕様

メソッド:

```txt
GET
```

クエリ:

```txt
album_id
```

例:

```txt
https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=1
```

---

## 22. List.php のレスポンス例

```json
{
  "success": true,
  "message": "写真一覧取得成功",
  "photos": [
    {
      "photo_id": 5,
      "album_id": 1,
      "uploaded_by": 1,
      "file_url": "albums/1/photos/2026/07/01/d06f7559347d7c0b63bc0916e71038d0.png",
      "caption": "S3アップロードテスト",
      "shot_at": "2026-07-01 19:00:00",
      "image_url": "https://tabi-app-uploads-bell.s3.ap-northeast-1.amazonaws.com/...",
      "s3_key": "albums/1/photos/2026/07/01/d06f7559347d7c0b63bc0916e71038d0.png"
    }
  ]
}
```

React側で画像表示に使うのは `image_url` です。

```jsx
<img src={photo.image_url} />
```

---

## 23. React表示側の使い方

写真一覧取得:

```js
const response = await fetch(
  `https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=${albumId}`
);

const data = await response.json();

if (data.success) {
  setPhotos(data.photos || []);
}
```

表示:

```jsx
{photos.map((photo) => (
  <img
    key={photo.photo_id}
    src={photo.image_url}
    alt={photo.caption || 'アルバム写真'}
  />
))}
```

注意:

```txt
Reactでは file_url ではなく image_url を使う
file_url はS3キーまたは既存外部URL
```

---

## 24. Reactアップロード側の使い方

```js
const formData = new FormData();

formData.append('image', selectedFile);
formData.append('album_id', albumId);
formData.append('user_id', userId);
formData.append('caption', caption);
formData.append('shot_at', '');

const response = await fetch(
  'https://genshin.mond.jp/TABI/api/Photos/Upload.php',
  {
    method: 'POST',
    body: formData,
  }
);

const data = await response.json();

if (!data.success) {
  throw new Error(data.message || '画像アップロードに失敗しました');
}
```

アップロード成功後は、再度 `Photos/List.php` を呼んで画面を更新します。

---

## 25. フロント実装で一時的に固定していた値

テスト時は以下を固定していました。

```js
const albumId = 1;
const userId = 1;
```

本実装では固定せず、以下から取得する必要があります。

```txt
albumId:
  現在開いているアルバムID
  または旅行IDから取得したアルバムID

userId:
  ログイン中のユーザーID
```

---

## 26. S3側で確認済みの状態

S3上で以下が作成されることを確認しました。

```txt
test/connection-20260701-185420.txt
```

画像アップロードAPIでは、以下のようなキーで画像が保存されます。

```txt
albums/1/photos/2026/07/01/d06f7559347d7c0b63bc0916e71038d0.png
```

---

## 27. なぜ署名付きURLを使うのか

S3バケットを非公開にしているため、Reactから直接S3キーを指定しても画像は表示できません。

そこで、PHP APIがS3キーから一時的な署名付きURLを作成し、Reactに返しています。

```txt
S3キー:
  DBに保存する恒久的な保存先

署名付きURL:
  一時的な表示用URL
  Reactでimg srcに使う
```

署名付きURLの有効期限は現在 `+60 minutes` です。

```php
$request = $s3->createPresignedRequest($cmd, '+60 minutes');
```

---

## 28. 今後やると良いこと

### 28.1 userId / albumId の動的化

現在のテストでは `album_id=1`、`user_id=1` を使いました。

本番ではログイン中のユーザーと現在開いている旅行・アルバムに合わせる必要があります。

---

### 28.2 画像削除API

今後必要になるAPI:

```txt
Photos/Delete.php
```

処理内容:

```txt
RDSから対象photoを取得
S3の該当キーを削除
RDSのphotosレコードを削除
```

---

### 28.3 画像拡大表示

React側で画像をタップしたときにモーダル表示すると、アルバムらしくなります。

---

### 28.4 サムネイル作成

今はアップロードした画像をそのまま表示しています。

将来的には以下のような構成にできます。

```txt
albums/{album_id}/photos/...
albums/{album_id}/thumbnails/...
```

ただし、ロリポップ上で画像変換処理を入れると処理負荷が増えるため、まずは現状のままでOKです。

---

### 28.5 署名付きURL方式からCloudFrontへ移行

今は署名付きURLを使っています。

長期的に画像配信が増える場合はCloudFrontの導入を検討できます。

```txt
現在:
  PHP APIが署名付きURLを発行

将来:
  CloudFront経由で配信
```

---

## 29. セキュリティ注意事項

### 29.1 AWSキーを公開しない

以下をGitに上げないでください。

```txt
config/env.php
api/config/env.php
```

`.gitignore` 推奨:

```gitignore
api/config/env.php
api/api/config/env.php
*.sql
*.bak
```

---

### 29.2 アクセスキーが漏れたらすぐ無効化

IAMユーザー `tabi-s3-user` のアクセスキーが漏れた可能性がある場合:

```txt
IAM
↓
ユーザー
↓
tabi-s3-user
↓
セキュリティ認証情報
↓
該当アクセスキーを無効化または削除
↓
新しいアクセスキーを作成
↓
ロリポップのenv.phpを更新
```

---

### 29.3 S3バケットを公開しない

バケットのパブリックアクセスブロックはONのままにしてください。

```txt
パブリックアクセスをすべてブロック: ON
```

---

## 30. トラブルシューティング

### 30.1 S3にアップロードできない

確認すること:

```txt
AWS_ACCESS_KEY_ID が正しいか
AWS_SECRET_ACCESS_KEY が正しいか
AWS_BUCKET が tabi-app-uploads-bell になっているか
AWS_DEFAULT_REGION が ap-northeast-1 になっているか
IAMポリシーにPutObjectがあるか
```

---

### 30.2 Reactで画像が表示されない

確認すること:

```txt
Photos/List.php?album_id=1 をブラウザで開く
JSONに image_url があるか確認
image_url を直接ブラウザで開けるか確認
Reactで file_url ではなく image_url を使っているか確認
```

---

### 30.3 S3キーはDBにあるが画像が表示されない

原因候補:

```txt
S3に該当キーの画像が存在しない
バケット名が違う
署名付きURL発行時のKeyが間違っている
IAMにGetObject権限がない
```

---

### 30.4 PHPの構文エラー

確認:

```bash
/usr/local/php/8.3/bin/php -l Photos/Upload.php
/usr/local/php/8.3/bin/php -l Photos/List.php
/usr/local/php/8.3/bin/php -l config/env.php
```

---

### 30.5 ComposerがPHPを見つけられない

エラー:

```txt
/usr/bin/env: php: そのようなファイルやディレクトリはありません
```

対応:

```bash
export PATH=/usr/local/php/8.3/bin:$PATH
composer --version
```

---

## 31. 最終状態

```txt
S3バケット:
  tabi-app-uploads-bell
  非公開
  SSE-S3暗号化

IAM:
  tabi-s3-user
  tabi-s3-policy付与済み

ロリポップ:
  AWS SDK for PHP導入済み
  env.phpにS3設定済み

API:
  Photos/Upload.php 作成済み
  Photos/List.php 作成済み

DB:
  photos.file_url にS3キー保存

React:
  image_url で画像表示成功
  Upload.php経由で画像アップロード成功
```

---

## 32. 表示側担当者への共有事項

### 写真一覧API

```txt
GET https://genshin.mond.jp/TABI/api/Photos/List.php?album_id=1
```

Reactで使う値:

```txt
photo.image_url
```

### 写真アップロードAPI

```txt
POST https://genshin.mond.jp/TABI/api/Photos/Upload.php
```

FormData:

```txt
image
album_id
user_id
caption
shot_at
```

### 注意

```txt
file_url はDB保存用のS3キーまたは既存外部URL
Reactのimgには基本 image_url を使う
```
