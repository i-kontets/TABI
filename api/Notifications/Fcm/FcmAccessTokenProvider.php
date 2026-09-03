<?php


/**
 * Firebase Cloud Messagingへ送信するためのアクセストークン取得処理をまとめたファイルです。
 *
 * 使用画面・機能: FCMプッシュ通知送信、端末トークン管理
 * 呼び出し元: 現在のコード内では直接のfetch呼び出しを確認できません。
 * URL: /api/Notifications/Fcm/FcmAccessTokenProvider.php
 * HTTPメソッド: コード内でHTTPメソッドの明示判定なし
 * 入力: コード内で明示された外部入力なし
 * 使用DB: このファイル内ではSQLを直接実行していません。
 * 認証情報や秘密鍵などの実値はコメントに残さず、処理の目的だけを説明します。
 */

declare(strict_types=1);

use Google\Auth\Credentials\ServiceAccountCredentials;

/**
 * FCM送信時に必要なGoogleのアクセストークンを取得・キャッシュするクラスです。
 *
 * 主な流れ:
 * 1. サービスアカウント認証ファイル(JSON)の内容が正しいかを検証する
 * 2. google/auth ライブラリを使ってアクセストークンを取得する
 * 3. 取得したトークンを有効期限までメモリに保持し、無駄な再取得を防ぐ
 *
 * 扱うデータ: サービスアカウントJSONファイル、Googleのアクセストークン。
 */
final class FcmAccessTokenProvider
{
    // 取得済みのアクセストークン(未取得なら null)。
    private ?string $accessToken = null;

    // トークンの有効期限(UNIX秒)。この時刻を過ぎたら再取得します。
    private int $expiresAt = 0;

    /**
     * コンストラクタ。設定(認証ファイルのパスなど)を受け取って保持します。
     */
    public function __construct(private readonly FcmConfig $config)
    {
    }

    /**
     * サービスアカウント認証ファイルが正しいかを検証します。
     * 問題があれば例外を投げ、トークン取得前に設定ミスに気づけるようにします。
     */
    public function validateCredentialsFile(): void
    {
        $path = $this->config->credentialsPath;

        // ファイルが存在し、読み取り可能であることを確認します。
        if (!is_file($path) || !is_readable($path)) {
            throw new RuntimeException('Service account credentials file is not readable.');
        }

        // ファイルの中身を読み込みます。
        $json = file_get_contents($path);
        if ($json === false) {
            throw new RuntimeException('Service account credentials file could not be read.');
        }

        // JSONとして解析できることを確認します。
        $credentials = json_decode($json, true);
        if (!is_array($credentials)) {
            throw new RuntimeException('Service account credentials file is not valid JSON.');
        }

        // 認証に最低限必要な項目がすべて入っているかを確認します。
        foreach (['type', 'project_id', 'private_key', 'client_email'] as $key) {
            if (!isset($credentials[$key]) || trim((string) $credentials[$key]) === '') {
                throw new RuntimeException('Service account credentials file is missing required fields.');
            }
        }

        // 認証ファイルの種類が「サービスアカウント」であることを確認します。
        if ((string) $credentials['type'] !== 'service_account') {
            throw new RuntimeException('Service account credentials type is invalid.');
        }

        // 認証ファイルのプロジェクトIDと環境変数のプロジェクトIDが一致するか確認します(取り違え防止)。
        if ((string) $credentials['project_id'] !== $this->config->projectId) {
            throw new RuntimeException('Service account project_id does not match FIREBASE_PROJECT_ID.');
        }

        // トークン取得に使うライブラリ(google/auth)が composer で入っているか確認します。
        if (!class_exists(ServiceAccountCredentials::class)) {
            throw new RuntimeException('google/auth is not installed or autoload is not available.');
        }
    }

    /**
     * FCM送信に使うアクセストークンを返します。
     * 有効なトークンをキャッシュ済みならそれを返し、なければ新しく取得します。
     */
    public function getAccessToken(): string
    {
        // キャッシュ済みトークンがあり、有効期限まで2分(120秒)以上余裕があればそのまま使います。
        // 2分のマージンは「送信中に期限切れになる」事故を防ぐためです。
        if ($this->accessToken !== null && time() < ($this->expiresAt - 120)) {
            return $this->accessToken;
        }

        // 新規取得の前に、認証ファイルが正しいかを検証します。
        $this->validateCredentialsFile();

        // google/auth ライブラリでサービスアカウント認証を行い、トークンを取得します。
        $credentials = new ServiceAccountCredentials(
            [FcmConfig::SCOPE],
            $this->config->credentialsPath
        );
        $token = $credentials->fetchAuthToken();

        // 期待した形式でトークンが返ってこなかった場合はエラーにします。
        if (!is_array($token) || !isset($token['access_token'])) {
            throw new RuntimeException('Could not obtain a Firebase access token.');
        }

        // トークンと有効期限をキャッシュします。
        // expires_in が無い場合は1時間(3600秒)、極端に短い場合でも最低5分(300秒)として扱います。
        $this->accessToken = (string) $token['access_token'];
        $expiresIn = isset($token['expires_in']) ? (int) $token['expires_in'] : 3600;
        $this->expiresAt = time() + max(300, $expiresIn);

        return $this->accessToken;
    }
}
