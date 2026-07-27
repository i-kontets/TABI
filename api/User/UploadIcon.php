<?php

/**
 * プロフィール、通知設定、問い合わせ、通報、メール変更など利用者本人の操作を扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * ログイン中ユーザーのプロフィール画像をS3へアップロードするAPIです。
 *
 * 流れ:
 * 1. ログイン状態と画像ファイルを確認する
 * 2. 画像の種類とサイズを検証する
 * 3. S3へ新しい画像を保存する
 * 4. DBの users.icon_url にS3キーを保存する
 * 5. 古いS3画像があれば削除し、表示用の署名付きURLを返す
 */
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";
// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../Groups/S3Common.php";

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $payload, int $status = 200): void
{
    // どの分岐からでも同じ形式でJSONを返し、二重にレスポンスしないよう exit します。
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 画像アップロードはファイルを送る処理なので、POST 以外は受け付けません。
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "POSTで送信してください。"], 405);
}

// セッションに user_id がない場合、どのユーザーの画像か判断できないため拒否します。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ログインが必要です。"], 401);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (empty($_FILES["image"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "画像ファイルを添付してください。"], 400);
}

$userId = (int) $_SESSION["user_id"];
$file = $_FILES["image"];
// MIMEタイプごとに保存時の拡張子を決めます。許可していない形式は後で400エラーにします。
$allowed = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp",
];
$maxSize = 10 * 1024 * 1024;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($file["error"] !== UPLOAD_ERR_OK) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "アップロードに失敗しました。"], 500);
}

// ブラウザから送られたContent-Typeは偽装できるため、サーバー側で実ファイルのMIMEタイプを確認します。
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file["tmp_name"]);
finfo_close($finfo);

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($allowed[$mime])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "JPEG / PNG / WebP のみ対応しています。"], 400);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($file["size"] > $maxSize) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ファイルサイズは10MB以内にしてください。"], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // 先に現在のアイコンS3キーを取得しておき、アップロード成功後に古い画像を削除できるようにします。
    $stmt = $pdo->prepare("SELECT icon_url FROM users WHERE user_id = :user_id LIMIT 1");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $current = $stmt->fetch(PDO::FETCH_ASSOC);
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$current) {
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "ユーザーが見つかりません。"], 404);
    }

    // S3へ保存するため、AWS設定を読み込み、S3クライアントを作成します。
    // AWS設定を読み込み、S3へアップロードできるクライアントを作ります。秘密情報の値は画面へ返しません。
    $aws = loadAwsConfig();
    $s3 = $aws ? createS3Client($aws) : null;
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$s3) {
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (function_exists("logSystemError")) {
            logSystemError("s3", "error", "ユーザーアイコン用S3クライアントの初期化に失敗しました", [
                "user_id" => $userId,
            ], $userId);
        }
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(["success" => false, "message" => "S3設定が見つかりません。env.php と AWS SDK（vendor）を確認してください。"], 500);
    }

    $ext = $allowed[$mime];
    // ランダム文字列を含めたS3キーにすることで、同名ファイルの上書きや推測しやすいURLを避けます。
    // ユーザーIDとランダム文字列を使ってS3キーを作り、他人がファイル名を推測しにくくします。
    $s3Key = sprintf("User/%d/profile/%s.%s", $userId, bin2hex(random_bytes(16)), $ext);

    // S3へ画像本体を保存します。ContentType を設定すると、ブラウザが画像として表示しやすくなります。
    // S3へプロフィール画像を保存します。ContentTypeを設定し、画像として表示しやすい状態で保存します。
    $s3->putObject([
        "Bucket" => $aws["bucket"],
        "Key" => $s3Key,
        "SourceFile" => $file["tmp_name"],
        "ContentType" => $mime,
    ]);

    // DBには有効期限がある署名付きURLではなく、永続的に参照できるS3キーを保存します。
    // DBにはS3キーだけを保存します。署名付きURLは期限切れになるため、保存用の値には使いません。
    $stmt = $pdo->prepare("UPDATE users SET icon_url = :icon_url, updated_at = :updated_at WHERE user_id = :user_id");
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":icon_url", $s3Key);
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":updated_at", (new DateTimeImmutable("now"))->format("Y-m-d H:i:s"));
    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();

    $oldKey = $current["icon_url"] ?? null;
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($oldKey && strpos($oldKey, "User/") === 0 && $oldKey !== $s3Key) {
        // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
        try {
            // DB更新が成功した後で古い画像を削除します。削除失敗は表示更新の成功を妨げないよう握りつぶします。
            $s3->deleteObject(["Bucket" => $aws["bucket"], "Key" => $oldKey]);
        // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
        } catch (Throwable $ignored) {
        }
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "message" => "ユーザーアイコンをアップロードしました。",
        // file_url はDBに保存したS3キー、image_url は画面表示用の一時URLです。
        "file_url" => $s3Key,
        // フロントエンドがすぐ表示できるよう、保存したS3キーから一時的な署名付きURLを作ります。
        "image_url" => presignS3Url($s3, $aws["bucket"], $s3Key),
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (function_exists("logSystemError")) {
        logSystemError("s3", "error", "ユーザーアイコンアップロードに失敗しました", [
            "user_id" => $userId ?? null,
            "error" => $error->getMessage(),
        ], $userId ?? null);
    }
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "ユーザーアイコンのアップロードに失敗しました。"], 500);
}
