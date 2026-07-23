<?php

$action = (string) ($_GET["action"] ?? "list");
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
if ($action === "list" && $method === "GET") require __DIR__ . "/List.php";
if ($action === "unread-count" && $method === "GET") require __DIR__ . "/UnreadCount.php";
if ($action === "mark-read" && $method === "PATCH") require __DIR__ . "/MarkRead.php";
if ($action === "read-all" && $method === "PATCH") require __DIR__ . "/MarkAllRead.php";
session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/Common.php";
notificationRespond(["success" => false, "message" => "通知APIのURLまたはメソッドが正しくありません。"], 404);
