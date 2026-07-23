<?php

declare(strict_types=1);

use Google\Auth\Credentials\ServiceAccountCredentials;

final class FcmAccessTokenProvider
{
    private ?string $accessToken = null;
    private int $expiresAt = 0;

    public function __construct(private readonly FcmConfig $config)
    {
    }

    public function validateCredentialsFile(): void
    {
        $path = $this->config->credentialsPath;

        if (!is_file($path) || !is_readable($path)) {
            throw new RuntimeException('Service account credentials file is not readable.');
        }

        $json = file_get_contents($path);
        if ($json === false) {
            throw new RuntimeException('Service account credentials file could not be read.');
        }

        $credentials = json_decode($json, true);
        if (!is_array($credentials)) {
            throw new RuntimeException('Service account credentials file is not valid JSON.');
        }

        foreach (['type', 'project_id', 'private_key', 'client_email'] as $key) {
            if (!isset($credentials[$key]) || trim((string) $credentials[$key]) === '') {
                throw new RuntimeException('Service account credentials file is missing required fields.');
            }
        }

        if ((string) $credentials['type'] !== 'service_account') {
            throw new RuntimeException('Service account credentials type is invalid.');
        }

        if ((string) $credentials['project_id'] !== $this->config->projectId) {
            throw new RuntimeException('Service account project_id does not match FIREBASE_PROJECT_ID.');
        }

        if (!class_exists(ServiceAccountCredentials::class)) {
            throw new RuntimeException('google/auth is not installed or autoload is not available.');
        }
    }

    public function getAccessToken(): string
    {
        if ($this->accessToken !== null && time() < ($this->expiresAt - 120)) {
            return $this->accessToken;
        }

        $this->validateCredentialsFile();

        $credentials = new ServiceAccountCredentials(
            [FcmConfig::SCOPE],
            $this->config->credentialsPath
        );
        $token = $credentials->fetchAuthToken();

        if (!is_array($token) || !isset($token['access_token'])) {
            throw new RuntimeException('Could not obtain a Firebase access token.');
        }

        $this->accessToken = (string) $token['access_token'];
        $expiresIn = isset($token['expires_in']) ? (int) $token['expires_in'] : 3600;
        $this->expiresAt = time() + max(300, $expiresIn);

        return $this->accessToken;
    }
}
