<?php
/**
 * S3画像処理で共通して使う関数をまとめたファイルです。
 *
 * S3はAWSのファイル保存サービスです。
 * バケットは保存先の大きな箱、S3キーはその箱の中でファイルの場所を表す文字列です。
 * DBには期限付きURLではなくS3キーを保存し、画面表示が必要なタイミングで署名付きURLを発行します。
 */

$systemErrorsPath = __DIR__ . "/../Admin/services/system_errors.php";
if (file_exists($systemErrorsPath)) {
    require_once $systemErrorsPath;
}

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

function createS3Client(array $aws)
{
    // AWS SDK の autoload.php を読み込むと、Aws\S3\S3Client クラスが使えるようになります。
    $autoload = __DIR__ . "/../vendor/autoload.php";

    if (!file_exists($autoload)) {
        if (function_exists("logSystemError")) {
            logSystemError("s3", "error", "AWS SDK autoload が見つかりません", [
                "path" => $autoload,
            ]);
        }
        return null;
    }

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

function presignS3Url($s3, string $bucket, string $key): ?string
{
    try {
        // GetObject はS3からファイルを取得する命令です。
        // createPresignedRequest により、ログイン情報を持たないブラウザでも一時的に画像を見られるURLを作ります。
        $cmd = $s3->getCommand("GetObject", [
            "Bucket" => $bucket,
            "Key" => $key,
        ]);
        $request = $s3->createPresignedRequest($cmd, "+60 minutes");

        return (string) $request->getUri();
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
