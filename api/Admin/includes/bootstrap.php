<?php

// 管理画面 API で使う共通ファイルを、依存関係の順にまとめて読み込みます。
// DB 接続 -> 基本ユーティリティ -> 設定 -> 外部連携 -> 実処理ハンドラの順で初期化します。
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/http.php";
require_once __DIR__ . "/formatters.php";
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/../services/system_errors.php";
require_once __DIR__ . "/../services/realtime.php";
require_once __DIR__ . "/../services/inquiry_reply.php";
require_once __DIR__ . "/../repositories/admin_fetchers.php";
require_once __DIR__ . "/../handlers/get.php";
require_once __DIR__ . "/../handlers/post.php";
require_once __DIR__ . "/../handlers/patch.php";
require_once __DIR__ . "/../handlers/delete.php";
require_once __DIR__ . "/../handlers/request.php";
