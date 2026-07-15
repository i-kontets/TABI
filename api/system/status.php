<?php
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Pragma: no-cache");

require_once __DIR__ . "/../config/serviceSchedule.php";

$status = tabiEvaluateServiceSchedule();

echo json_encode([
    "success" => true,
    "available" => $status["available"],
    "reason" => $status["reason"],
    "now" => $status["now"],
    "nextOpenAt" => $status["nextOpenAt"],
    "nextCloseAt" => $status["nextCloseAt"],
    "timezone" => $status["timezone"],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
