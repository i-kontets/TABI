<?php

/**
 * 旅行グループの作成、一覧、メンバー、画像アップロードを扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッションを開始し、ログイン中のユーザー情報をサーバー側で使えるようにします。
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む（$pdo を使用）
require_once __DIR__ . "/../config/db.php";
// S3共通処理（AWS-S3.md の Photos 実装と同じ方針）
require_once __DIR__ . "/S3Common.php";

// レスポンスをJSONで返して終了する共通関数
/**
 * APIレスポンスをJSON形式で返し、HTTPステータスもここでそろえます。
 *
 * @param array $payload 呼び出し元から渡される処理対象の値です。
 * @param int $status = 200 呼び出し元から渡される処理対象の値です。
 * @return void 宣言された型に合わせて処理結果を返します。
 * エラー時はHTTPステータス、ログ、または共通レスポンスで呼び出し元へ伝えます。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// POST 以外は受け付けない
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "POSTで送信してください。"
    ], 405);
}

// 未ログインなら401
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "ログインが必要です。"
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

// 対象グループID（multipart/form-data の group_id）
$groupId = (int) ($_POST["group_id"] ?? 0);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($groupId <= 0) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "group_id を指定してください。"
    ], 400);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (empty($_FILES["image"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "画像ファイルが添付されていません。"
    ], 400);
}

// AWS/S3の流れ: 画像を受け取る → MIME種類とサイズを確認する → S3キーを作る → S3へ保存する → DBにはS3キーだけ保存する → 表示用に署名付きURLを返す。
$file = $_FILES["image"];
// Photos/Upload.php と同じ制限（JPEG / PNG / WebP、最大10MB）
$allowed = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp",
];
$maxSize = 10 * 1024 * 1024;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($file["error"] !== UPLOAD_ERR_OK) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "アップロードに失敗しました。（エラーコード: " . $file["error"] . "）"
    ], 500);
}

// MIME は実ファイルから検証する（Content-Type ヘッダは偽装可能なため）
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file["tmp_name"]);
finfo_close($finfo);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($allowed[$mime])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "JPEG / PNG / WebP のみ対応しています。"
    ], 400);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($file["size"] > $maxSize) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "ファイルサイズは10MB以内にしてください。"
    ], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // ログイン中ユーザーがこのグループの承認済みメンバーであることを確認する
    $stmt = $pdo->prepare("
        SELECT 1
        FROM group_members
        WHERE group_id = :group_id
          AND user_id = :user_id
          AND invitation_status = 'accepted'
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$stmt->fetch()) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond([
            "success" => false,
            "message" => "このグループのメンバーではありません。"
        ], 403);
    }

    // 差し替え時に古い画像を消すため、現在のS3キーを取得しておく
    $stmt = $pdo->prepare("
        SELECT trip_id, group_icon
        FROM trips
        WHERE group_id = :group_id
        ORDER BY (start_date IS NULL) ASC, start_date DESC, trip_id DESC
        LIMIT 1
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":group_id", $groupId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $current = $stmt->fetch(PDO::FETCH_ASSOC);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$current) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond([
            "success" => false,
            "message" => "画像を保存する旅行レコードが見つかりません。"
        ], 404);
    }

    $tripId = (int) $current["trip_id"];
    $oldKey = $current["group_icon"] ?? null;

    // S3クライアントを準備する
    // AWS SDKでS3へ接続する準備をします。設定不足ならアップロードを進めず、原因が分かるJSONを返します。
    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$s3) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond([
            "success" => false,
            "message" => "S3の設定が見つかりません。env.php と AWS SDK（vendor）を確認してください。"
        ], 500);
    }

    // S3キー設計は AWS-S3.md に合わせる:
    //   groups/{group_id}/cover/YYYY/MM/DD/{ランダム文字列}.{拡張子}
    $ext = $allowed[$mime];
    // S3キーは「S3の中の保存場所」です。利用者が推測しにくい名前にして、同名ファイルの上書きを避けます。
    $s3Key = sprintf(
        "Icon/%s.%s",
        bin2hex(random_bytes(16)),
        $ext
    );

    // S3へアップロード
    // S3へ画像本体を送ります。ContentTypeを付けることで、ブラウザやS3が画像の種類を正しく判断できます。
    $s3->putObject([
        "Bucket" => $aws["bucket"],
        "Key" => $s3Key,
        "SourceFile" => $file["tmp_name"],
        "ContentType" => $mime,
    ]);

    // DBにはS3キーだけを保存する（署名付きURLは保存しない）
    // DBには期限切れになる署名付きURLではなくS3キーを保存します。表示が必要な時にだけ、新しい署名付きURLへ変換します。
    $stmt = $pdo->prepare("
        UPDATE trips
        SET group_icon = :group_icon,
            updated_at = :updated_at
        WHERE trip_id = :trip_id
    ");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":group_icon", $s3Key);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":updated_at", (new DateTimeImmutable("now"))->format("Y-m-d H:i:s"));
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":trip_id", $tripId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    // 古い画像がS3キーなら削除する（外部URLは対象外）
    if ($oldKey && strpos($oldKey, "http://") !== 0 && strpos($oldKey, "https://") !== 0) {
        // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
        try {
            // 古いS3画像を削除します。DB更新後に削除することで、新しい画像の保存に成功した状態を優先します。
            $s3->deleteObject([
                "Bucket" => $aws["bucket"],
                "Key" => $oldKey,
            ]);
        // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
        } catch (Throwable $error) {
            // 削除失敗は致命的ではないため処理を続行する
        }
    }

    // 表示用の署名付きURLを発行して返す
    respond([
        "success" => true,
        "message" => "グループ画像をアップロードしました。",
        "file_url" => $s3Key,
        // 署名付きURLを作り、アップロード直後の画面で新しい画像を表示できるようにします。
        "image_url" => presignS3Url($s3, $aws["bucket"], $s3Key)
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "グループ画像のアップロードに失敗しました。"
    ], 500);
}
