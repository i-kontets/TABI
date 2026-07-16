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

/**
 * S3画像処理で共通して使う関数をまとめたファイルです。
 *
 * S3はAWSのファイル保存サービスです。
 * バケットは保存先の大きな箱、S3キーはその箱の中でファイルの場所を表す文字列です。
 * DBには期限付きURLではなくS3キーを保存し、画面表示が必要なタイミングで署名付きURLを発行します。
 */

$systemErrorsPath = __DIR__ . "/../Admin/services/system_errors.php";
// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (file_exists($systemErrorsPath)) {
    // 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
    require_once $systemErrorsPath;
}

/**
 * loadAwsConfig は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function loadAwsConfig(): ?array
{
    // env.php と環境変数の両方を確認し、S3接続に必要な認証情報を集めます。
    // 秘密情報をコードに直接書かないことで、Gitに認証情報が残る事故を防ぎます。
    $configPath = __DIR__ . "/../config/env.php";
    $config = file_exists($configPath) ? require $configPath : [];
    $storage = $config["aws_storage"] ?? [];

    $key = ($storage["AWS_ACCESS_KEY_ID"] ?? $config["AWS_ACCESS_KEY_ID"] ?? getenv("AWS_ACCESS_KEY_ID")) ?: null;
    $secret = ($storage["AWS_SECRET_ACCESS_KEY"] ?? $config["AWS_SECRET_ACCESS_KEY"] ?? getenv("AWS_SECRET_ACCESS_KEY")) ?: null;
    $region = ($storage["AWS_DEFAULT_REGION"] ?? $config["AWS_DEFAULT_REGION"] ?? getenv("AWS_DEFAULT_REGION")) ?: "ap-northeast-1";
    $bucket = ($storage["AWS_BUCKET"] ?? $config["AWS_BUCKET"] ?? getenv("AWS_BUCKET")) ?: null;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$key || !$secret || !$bucket) {
        // 必須情報が1つでも足りない場合は、S3を使えない状態として呼び出し元に知らせます。
        return null;
    }

    return [
        "key" => $key,
        "secret" => $secret,
        "region" => $region,
        "bucket" => $bucket,
    ];
}

/**
 * createS3Client は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function createS3Client(array $aws)
{
    // AWS SDK の autoload.php を読み込むと、Aws\S3\S3Client クラスが使えるようになります。
    $autoload = __DIR__ . "/../vendor/autoload.php";

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!file_exists($autoload)) {
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (function_exists("logSystemError")) {
            logSystemError("s3", "error", "AWS SDK autoload が見つかりません", [
                "path" => $autoload,
            ]);
        }
        return null;
    }

    // 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
    require_once $autoload;

    return new Aws\S3\S3Client([
        "version" => "latest",
        "region" => $aws["region"],
        "credentials" => [
            "key" => $aws["key"],
            "secret" => $aws["secret"],
        ],
    ]);
}

/**
 * presignS3Url は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function presignS3Url($s3, string $bucket, string $key): ?string
{
    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        // GetObject はS3からファイルを取得する命令です。
        // createPresignedRequest により、ログイン情報を持たないブラウザでも一時的に画像を見られるURLを作ります。
        $cmd = $s3->getCommand("GetObject", [
            "Bucket" => $bucket,
            "Key" => $key,
        ]);
        $request = $s3->createPresignedRequest($cmd, "+60 minutes");

        return (string) $request->getUri();
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $error) {
        // URL生成に失敗してもAPI全体を落とさず、nullを返して画面側で画像なしとして扱えるようにします。
        if (function_exists("logSystemError")) {
            logSystemError("s3", "warning", "S3署名付きURL生成に失敗しました", [
                "bucket" => $bucket,
                "key" => $key,
                "error" => $error->getMessage(),
            ]);
        }
        return null;
    }
}

/**
 * resolveGroupImageUrl は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolveGroupImageUrl(?string $fileUrl, $s3, ?string $bucket): ?string
{
    // DBに保存されている値が空なら、画面に出せる画像もないため null を返します。
    if (!$fileUrl) {
        return null;
    }

    // すでに http から始まる値は外部URLとして扱い、S3キーへの変換は行いません。
    if (strpos($fileUrl, "http://") === 0 || strpos($fileUrl, "https://") === 0) {
        return $fileUrl;
    }

    // ここまで来た値はS3キーとみなし、表示用の署名付きURLへ変換します。
    if (!$s3 || !$bucket) {
        return null;
    }

    return presignS3Url($s3, $bucket, $fileUrl);
}
