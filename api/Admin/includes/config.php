<?php

// 設定配列 → 環境変数 → デフォルト値の順で値を決めます。
function app_config(string $key, $default = null)
{
    global $config;
        // まず設定配列を見て、空でなければそれを優先します。
    if (!empty($config[$key])) {
        return $config[$key];
    }
        // 設定配列に無い場合は、環境変数から読みます。
    $envValue = getenv($key);
    return $envValue !== false && $envValue !== "" ? $envValue : $default;
}

