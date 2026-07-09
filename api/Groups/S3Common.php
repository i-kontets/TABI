<?php

function loadAwsConfig(): ?array
{
    $configPath = __DIR__ . "/../config/env.php";
    $config = file_exists($configPath) ? require $configPath : [];
    $storage = $config["aws_storage"] ?? [];

    $key = ($storage["AWS_ACCESS_KEY_ID"] ?? $config["AWS_ACCESS_KEY_ID"] ?? getenv("AWS_ACCESS_KEY_ID")) ?: null;
    $secret = ($storage["AWS_SECRET_ACCESS_KEY"] ?? $config["AWS_SECRET_ACCESS_KEY"] ?? getenv("AWS_SECRET_ACCESS_KEY")) ?: null;
    $region = ($storage["AWS_DEFAULT_REGION"] ?? $config["AWS_DEFAULT_REGION"] ?? getenv("AWS_DEFAULT_REGION")) ?: "ap-northeast-1";
    $bucket = ($storage["AWS_BUCKET"] ?? $config["AWS_BUCKET"] ?? getenv("AWS_BUCKET")) ?: null;

    if (!$key || !$secret || !$bucket) {
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
    $autoload = __DIR__ . "/../vendor/autoload.php";

    if (!file_exists($autoload)) {
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
        $cmd = $s3->getCommand("GetObject", [
            "Bucket" => $bucket,
            "Key" => $key,
        ]);
        $request = $s3->createPresignedRequest($cmd, "+60 minutes");

        return (string) $request->getUri();
    } catch (Throwable $error) {
        return null;
    }
}

function resolveGroupImageUrl(?string $fileUrl, $s3, ?string $bucket): ?string
{
    if (!$fileUrl) {
        return null;
    }

    if (strpos($fileUrl, "http://") === 0 || strpos($fileUrl, "https://") === 0) {
        return $fileUrl;
    }

    if (!$s3 || !$bucket) {
        return null;
    }

    return presignS3Url($s3, $bucket, $fileUrl);
}
