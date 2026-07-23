<?php

declare(strict_types=1);

/**
 * FCM(Firebase Cloud Messaging = プッシュ通知)送信に必要な設定を管理するクラスです。
 *
 * 主な流れ:
 * 1. サーバーの環境変数からFirebaseのプロジェクトIDと認証ファイルのパスを読み取る
 * 2. 送信先のAPIエンドポイントURLを組み立てる
 * 3. 送信するメッセージ内容(タイトル・本文・遷移先など)の検証・整形も担当する
 *
 * 扱うデータ: FIREBASE_PROJECT_ID などの環境変数、FCMへ送るメッセージ配列。
 */
final class FcmConfig
{
    // FCM送信に必要なGoogle APIの権限スコープ(アクセストークン取得時に使用)です。
    public const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    /**
     * コンストラクタ。readonly のため、一度作られた設定は後から変更できません。
     *
     * @param string $projectId       FirebaseのプロジェクトID
     * @param string $credentialsPath サービスアカウント認証JSONファイルのパス
     * @param bool   $sendEnabled     実際に送信するかどうかのフラグ(falseなら送信を止められる)
     */
    public function __construct(
        public readonly string $projectId,
        public readonly string $credentialsPath,
        public readonly bool $sendEnabled
    ) {
    }

    /**
     * サーバーの環境変数から設定を読み取り、FcmConfig を作成します。
     * 必須の環境変数が未設定・不正な場合は例外を投げて処理を止めます。
     */
    public static function fromEnvironment(): self
    {
        // 各環境変数を読み取り、前後の空白を取り除きます。
        $projectId = trim((string) getenv('FIREBASE_PROJECT_ID'));
        $credentialsPath = trim((string) getenv('GOOGLE_APPLICATION_CREDENTIALS'));
        // FCM_SEND_ENABLED が文字列 "true" のときだけ送信を有効にします(誤送信防止のスイッチ)。
        $sendEnabled = strtolower(trim((string) getenv('FCM_SEND_ENABLED'))) === 'true';

        // プロジェクトIDが未設定なら設定ミスとしてエラーにします。
        if ($projectId === '') {
            throw new RuntimeException('FIREBASE_PROJECT_ID is not set.');
        }
        // プロジェクトIDは英小文字・数字・ハイフンのみ許可します(URLに埋め込むための安全確認)。
        if (!preg_match('/^[a-z0-9-]+$/', $projectId)) {
            throw new RuntimeException('FIREBASE_PROJECT_ID has an invalid format.');
        }
        // 認証ファイルのパスが未設定なら設定ミスとしてエラーにします。
        if ($credentialsPath === '') {
            throw new RuntimeException('GOOGLE_APPLICATION_CREDENTIALS is not set.');
        }

        // 検証済みの値で設定オブジェクトを作って返します。
        return new self(
            projectId: $projectId,
            credentialsPath: $credentialsPath,
            sendEnabled: $sendEnabled
        );
    }

    /**
     * FCM HTTP v1 APIの送信先URLを組み立てて返します。
     * プロジェクトIDはURLエンコードして安全に埋め込みます。
     */
    public function endpoint(): string
    {
        return sprintf('https://fcm.googleapis.com/v1/projects/%s/messages:send', rawurlencode($this->projectId));
    }

    /**
     * 通知タップ時の遷移先パス(actionPath)を検証します。
     * TABIアプリ内部のパス(/TABI/...)のみ許可し、外部URLなどは例外で拒否します。
     */
    public static function validateActionPath(string $actionPath): string
    {
        $actionPath = trim($actionPath);

        // 空文字は遷移先として無効です。
        if ($actionPath === '') {
            throw new InvalidArgumentException('actionPath is required.');
        }
        // 改行や制御文字を含むパスは不正とみなします(ヘッダー偽装などの防止)。
        if (preg_match('/[\r\n\x00-\x1F\x7F]/', $actionPath)) {
            throw new InvalidArgumentException('actionPath contains invalid characters.');
        }
        // "https://..." のようなスキーム付きURLや "//example.com" 形式の外部URLを拒否します。
        if (str_contains($actionPath, '://') || str_starts_with($actionPath, '//')) {
            throw new InvalidArgumentException('actionPath must be an internal TABI path.');
        }
        // TABIアプリ内のパス(/TABI または /TABI/で始まるもの)だけを許可します。
        if ($actionPath !== '/TABI' && !str_starts_with($actionPath, '/TABI/')) {
            throw new InvalidArgumentException('actionPath must start with /TABI.');
        }

        return $actionPath;
    }

    /**
     * 疎通確認(テスト送信)用のメッセージ内容を作って返します。
     * CLIツール(send_fcm_test.php)から使われます。
     */
    public static function testMessagePayload(): array
    {
        // テスト通知のタップ先は通知一覧画面に固定します。
        $actionPath = self::validateActionPath('/TABI/notifications');

        return [
            // 端末に表示される通知のタイトルと本文です。
            'notification' => [
                'title' => 'TABI通知テスト',
                'body' => 'FCM HTTP v1 APIの疎通確認です。',
            ],
            // アプリ側で処理するための付加データです(すべて文字列で渡す必要があります)。
            'data' => [
                'type' => 'test',
                'actionPath' => $actionPath,
                'source' => 'cli',
            ],
            // Webプッシュの場合に通知クリックで開くリンクを指定します。
            'webpush' => [
                'fcm_options' => [
                    'link' => $actionPath,
                ],
            ],
        ];
    }

    /**
     * 送信前のメッセージ配列を検証・整形します。
     * タイトル・本文の必須チェック、dataの文字列化、actionPathの検証を行います。
     */
    public static function normalizeMessage(array $message): array
    {
        // 通知のタイトルと本文は必須です。
        if (!isset($message['notification']['title'], $message['notification']['body'])) {
            throw new InvalidArgumentException('notification.title and notification.body are required.');
        }

        // 前後の空白を取り除いて整形します。
        $message['notification']['title'] = trim((string) $message['notification']['title']);
        $message['notification']['body'] = trim((string) $message['notification']['body']);

        // 空白だけのタイトル・本文は無効です。
        if ($message['notification']['title'] === '' || $message['notification']['body'] === '') {
            throw new InvalidArgumentException('notification.title and notification.body must not be empty.');
        }

        // 付加データ(data)は省略可能ですが、あれば連想配列である必要があります。
        $data = $message['data'] ?? [];
        if (!is_array($data)) {
            throw new InvalidArgumentException('message.data must be an object.');
        }
        // FCMの仕様上、dataのキーと値はすべて文字列でなければならないため変換します。
        foreach ($data as $key => $value) {
            $data[(string) $key] = (string) $value;
            // 数値キーだった場合は文字列キーに置き換えたので、元のキーを削除します。
            if ((string) $key !== $key) {
                unset($data[$key]);
            }
        }
        // 遷移先パスが含まれている場合は、内部パスであることを検証します。
        if (isset($data['actionPath'])) {
            $data['actionPath'] = self::validateActionPath($data['actionPath']);
        }
        $message['data'] = $data;

        return $message;
    }
}
