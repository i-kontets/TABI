<?php

/**
 * 旧URL互換用のチェックリストAPIルーターです。
 *
 * GET    /api/CheckList/CheckList.php -> List.php
 * POST   /api/CheckList/CheckList.php -> Add.php
 * PATCH  /api/CheckList/CheckList.php -> Update.php
 * DELETE /api/CheckList/CheckList.php -> Delete.php
 */

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "GET") require __DIR__ . "/List.php";
if ($method === "POST") require __DIR__ . "/Add.php";
if ($method === "PATCH") require __DIR__ . "/Update.php";
if ($method === "DELETE") require __DIR__ . "/Delete.php";

session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/Common.php";

checklistRespond([
    "success" => false,
    "message" => "許可されていないメソッドです",
], 405);
