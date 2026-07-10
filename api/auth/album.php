<?php
// セッション開始 - ユーザーのセッション管理を初期化
session_start();

// JSONレスポンスの設定
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込む
require_once __DIR__ . "/../config/db.php";

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "ログインしてください"
    ]);
    exit;
}

$action = $_GET["action"] ?? "";

if($action === "list"){
    if($_SERVER["REQUEST_METHOD"] !== "GET"){
        http_response_code(405);
        echo json_encode([
        "success" => false,
        "message" => "GETにしてください"
        ]);
        exit;
    }
    
    try{
        $sql = ""
    }
}

if($action === "add"){

}

if($action === "delete")