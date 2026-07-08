<?php

// 設定配列 → 環境変数 → デフォルト値の順で値を決めます。
function app_config(string $key, $default = null)
{
    global $config;
    if (!empty($config[$key])) {
        return $config[$key];
    }
    $envValue = getenv($key);
    return $envValue !== false && $envValue !== "" ? $envValue : $default;
}

