<?php
declare(strict_types=1);

// 必ずローカルDocker DBだけで実行します。本番設定・本番WebSocketは使用しません。
// テスト用ユーザーと通知を作成し、finallyで今回作った行だけを削除します。
if (PHP_SAPI !== 'cli' || getenv('DB_HOST') !== 'db' || getenv('DB_NAME') !== 'tabi') {
    fwrite(STDERR, "ローカルDocker環境専用です。\n"); exit(1);
}
$root = dirname(__DIR__, 3);
$pdo = new PDO('mysql:host=db;dbname=tabi;charset=utf8mb4', getenv('DB_USER'), getenv('DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
// RDSで確認したUTC接続を再現し、日本時間の入力との境界を検証します。
$pdo->exec("SET time_zone = '+00:00'");
$run = bin2hex(random_bytes(12));
$users = [];
$sessions = [];
$processes = [];
$eventFile = tempnam(sys_get_temp_dir(), 'tabi-events-');
$groupId = null;
$exitCode = 0;

function check(bool $condition, string $label): void
{
    if (!$condition) throw new RuntimeException($label);
    echo "PASS: $label\n";
}

// 管理者予約の回帰テストは常に稼働中・停止予告前の時計を渡します。
// 実行した曜日による失敗や、テストと無関係な全員向け停止予告の生成を防ぎます。
function runAdminPublisher(string $root, array $env): int
{
    $code = 'require $argv[1]; $result = runNotificationPublisher(null, static fn() => new DateTimeImmutable("2026-09-28T10:00:00+09:00")); exit(!empty($result["failed"]) ? 1 : 0);';
    $process = proc_open([PHP_BINARY, '-r', $code, $root . '/api/Notifications/cli/publish_admin_notices.php'], [0=>['file','/dev/null','r'],1=>['file','/dev/null','w'],2=>['file','/dev/null','w']], $pipes, $root, $env);
    return proc_close($process);
}

function requestApi(string $path, string $method = 'GET', ?string $session = null, ?array $body = null, ?string $origin = null): array
{
    // ログインは専用テストセッションを使います。Cookieの値は出力しません。
    $headers = ['Content-Type: application/json'];
    if ($session) $headers[] = 'Cookie: PHPSESSID=' . $session;
    if ($origin) $headers[] = 'Origin: ' . $origin;
    $handle = curl_init('http://127.0.0.1:18092/TABI/api/' . $path);
    curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 15]);
    if ($body !== null) curl_setopt($handle, CURLOPT_POSTFIELDS, json_encode($body));
    $raw = curl_exec($handle);
    $status = curl_getinfo($handle, CURLINFO_HTTP_CODE);
    curl_close($handle);
    return [$status, json_decode((string) $raw, true)];
}

try {
    // 既存ユーザーの権限・パスワード・既読状態は変更しません。
    foreach (['admin', 'A', 'B', 'viewer'] as $role) {
        $pdo->prepare("INSERT INTO users (name,email,password_hash,status,created_at,updated_at) VALUES (?,?,'unusable-test-hash','active',NOW(),NOW())")->execute(['通知検証' . $role, $run . $role . '@example.invalid']);
        $users[$role] = (int) $pdo->lastInsertId();
        $sessions[$role] = bin2hex(random_bytes(24));
        session_id($sessions[$role]);
        session_start();
        $_SESSION = ['user_id' => $users[$role]];
        session_write_close();
    }
    $pdo->prepare('INSERT INTO admin_users(user_id,admin_level,created_at) VALUES (?,9,NOW()),(?,1,NOW())')->execute([$users['admin'], $users['viewer']]);
    // テスト専用グループへAを参加済み、Bを招待待ちとして登録します。
    $pdo->prepare("INSERT INTO user_groups(group_name,created_by,status,created_at,updated_at) VALUES (?,?,'active',NOW(),NOW())")->execute(['通知検証グループ',$users['admin']]);
    $groupId = (int) $pdo->lastInsertId();
    $pdo->prepare("INSERT INTO group_members(group_id,user_id,invitation_status) VALUES (?,?,'accepted'),(?,?,'pending')")->execute([$groupId,$users['A'],$groupId,$users['B']]);
    $env = array_merge(getenv(), ['REALTIME_EMIT_URL' => 'http://127.0.0.1:18093/emit', 'REALTIME_SECRET' => 'local-test-placeholder', 'NOTICE_TEST_EVENTS' => $eventFile]);
    foreach ([['127.0.0.1:18093', __DIR__ . '/emit_stub.php'], ['127.0.0.1:18092', null]] as [$address, $router]) {
        $command = [PHP_BINARY, '-S', $address, '-t', dirname($root)];
        if ($router) $command[] = $router;
        $processes[] = proc_open($command, [0 => ['file','/dev/null','r'],1 => ['file','/dev/null','w'],2 => ['file','/dev/null','w']], $pipes, $root, $env);
    }
    usleep(400000);
    [$status] = requestApi('Admin/index.php?resource=notices');
    check($status === 401, '未ログインの管理APIを拒否');
    [$status] = requestApi('Admin/index.php?resource=notices', 'POST', $sessions['A'], []);
    check($status === 403, '一般ユーザーによる登録を拒否');
    [$status] = requestApi('Admin/index.php?resource=notices', 'POST', $sessions['viewer'], []);
    check($status === 403, '閲覧専用管理者による登録を拒否');
    $base = ['title' => '通知統合テスト', 'body' => '本文 <script>は文字列として保存</script>', 'target' => '全ユーザー', 'targetId' => '', 'startAt' => '', 'endAt' => '', 'push' => true, 'requestKey' => $run . '-all'];
    [$status] = requestApi('Admin/index.php?resource=notices', 'POST', $sessions['admin'], $base, 'https://foreign.example');
    check($status === 403, '別サイトからの登録を拒否');
    foreach ([['endAt'=>'2026/02/30 10:00'], ['title'=>str_repeat('あ',151)], ['target'=>'不明'], ['push'=>'false'], ['target'=>'特定ユーザー','targetId'=>'0'], ['endAt'=>'2000/01/01 00:00']] as $invalid) {
        [$status] = requestApi('Admin/index.php?resource=notices', 'POST', $sessions['admin'], array_merge($base,$invalid));
        check($status === 422, '不正入力を拒否: ' . implode(',',array_keys($invalid)));
    }
    [$status, $all] = requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],$base);
    check($status === 200 && !empty($all['notificationId']), '全ユーザー通知の登録API・通知DB保存');
    check($all['push'] === true, 'Push ONでも通知を生成し、希望フラグを保存');
    $stmt=$pdo->prepare('SELECT COUNT(*) AS total, SUM(is_read = 0 AND read_at IS NULL AND delivered_at IS NULL) AS unread FROM notification_recipients WHERE notification_id=?');
    $stmt->execute([$all['notificationId']]);
    $initial=$stmt->fetch(PDO::FETCH_ASSOC);
    $activeCount=(int)$pdo->query("SELECT COUNT(*) FROM users WHERE status='active' AND deleted_at IS NULL")->fetchColumn();
    check((int)$initial['total']===$activeCount && (int)$initial['unread']===$activeCount, '全有効ユーザーに未読・未配信の宛先を作成');
    [$status,$again] = requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],$base);
    check($status === 200 && $all['id'] === $again['id'], '同じ登録キーで再送しても重複しない');
    [$status]=requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],array_merge($base,['body'=>'別の内容']));
    check($status===422, '同じ登録キーで違う内容を送った場合は拒否');
    [$status]=requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],array_merge($base,['push'=>false]));
    check($status===422, '同じ登録キーでPushの希望だけ変えた場合も拒否');
    [$status]=requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],array_merge($base,['requestKey'=>$run.'-missing','target'=>'特定ユーザー','targetId'=>2147483647]));
    $stmt=$pdo->prepare('SELECT COUNT(*) FROM admin_notices WHERE request_key=?');
    $stmt->execute([$run.'-missing']);
    check($status===422 && (int)$stmt->fetchColumn()===0, '対象ユーザー不在ならお知らせ保存もrollback');
    $recipientIds=[];
    foreach (['A','B'] as $role) {
        [$status,$list] = requestApi('Notifications/List.php','GET',$sessions[$role]);
        $row=current(array_filter($list['data']['notifications'],fn($n)=>$n['notificationId']===$all['notificationId']));
        check($status===200 && $row && !$row['isRead'], "$role のAPI一覧に未読で表示");
        $recipientIds[$role]=$row['recipientId'];
        [, $count] = requestApi('Notifications/UnreadCount.php','GET',$sessions[$role]);
        check($count['data']['unreadCount']===1, "$role の未読件数が1");
    }
    [, $list] = requestApi('Notifications/List.php?recipientId='.$recipientIds['A'],'GET',$sessions['B']);
    check($list['data']['notifications']===[], 'BはAの通知詳細を取得できない');
    [$status] = requestApi('Notifications/MarkRead.php?recipientId='.$recipientIds['A'],'PATCH',$sessions['B']);
    check($status===404, 'BはAの通知を既読化できない');
    // 実ブラウザはPATCHへOriginを付けるため、ポート付きの同一ホストと別サイトを区別します。
    [$status] = requestApi('Notifications/MarkRead.php?recipientId='.$recipientIds['A'],'PATCH',$sessions['A'],null,'https://foreign.example');
    check($status===403, '別サイトからの既読操作を拒否');
    [$status] = requestApi('Notifications/MarkRead.php?recipientId='.$recipientIds['A'],'PATCH',$sessions['A'],null,'http://127.0.0.1:18092');
    [, $list] = requestApi('Notifications/List.php?recipientId='.$recipientIds['A'],'GET',$sessions['A']);
    [, $count] = requestApi('Notifications/UnreadCount.php','GET',$sessions['A']);
    check($status===200 && $list['data']['notifications'][0]['isRead'] && $list['data']['notifications'][0]['readAt'] && $count['data']['unreadCount']===0, '既読API後の再取得でも既読・件数を維持');
    foreach (['user'=>'特定ユーザー','group'=>'特定グループ'] as $kind=>$target) {
        $input=array_merge($base,['target'=>$target,'targetId'=>$kind==='user'?$users['A']:$groupId,'push'=>false,'requestKey'=>$run.'-'.$kind]);
        [$status,$notice]=requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],$input);
        $stmt=$pdo->prepare('SELECT user_id FROM notification_recipients WHERE notification_id=?');
        $stmt->execute([$notice['notificationId']??0]);
        check($status===200 && array_map('intval',$stmt->fetchAll(PDO::FETCH_COLUMN))===[$users['A']], "$target はAだけを宛先に保存（Bの招待待ちを除外）");
        check($notice['push']===false, "$target はPush OFFでも通知を作成");
        $events=array_map(fn($line)=>json_decode($line,true),file($eventFile));
        $rooms=array_column(array_values(array_filter($events,fn($event)=>$event['event']==='notification_created' && $event['data']['notificationId']===$notice['notificationId'])),'room');
        check($rooms===['user:'.$users['A']], "$target の送信依頼先もAだけ");
        // 保存済み通知を編集しても、宛先や通知IDを増やさず希望フラグだけ更新できます。
        [$status,$edited]=requestApi('Admin/index.php?resource=notices&id='.$notice['id'],'PATCH',$sessions['admin'],array_merge($input,['push'=>true]));
        check($status===200 && $edited['push']===true && $edited['notificationId']===$notice['notificationId'], "$target の編集でもPushの希望を保存");
    }
    $future=$pdo->query('SELECT DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 33 HOUR),"%Y-%m-%d %H:%i:%s")')->fetchColumn();
    $before=count(file($eventFile));
    [$status,$scheduled]=requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],array_merge($base,['startAt'=>$future,'requestKey'=>$run.'-future']));
    check($status===200 && count(file($eventFile))===$before+1, '予約登録では管理画面イベントだけを送信し、ユーザーへ即時送信しない');
    [, $list]=requestApi('Notifications/List.php','GET',$sessions['A']);
    check(!in_array($scheduled['notificationId'],array_column($list['data']['notifications'],'notificationId')), '公開前の通知は一覧へ出ない');
    requestApi('Notifications/MarkAllRead.php','PATCH',$sessions['A']);
    $stmt=$pdo->prepare('SELECT is_read FROM notification_recipients WHERE notification_id=? AND user_id=?');
    $stmt->execute([$scheduled['notificationId'],$users['A']]);
    check((int)$stmt->fetchColumn()===0, '一括既読で予約通知を既読にしない');
    // テストで作成した予約だけ時刻を進め、公開CLIの期限判定と再実行を確認します。
    $pdo->prepare('UPDATE admin_notices SET start_at=DATE_SUB(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 9 HOUR),INTERVAL 1 MINUTE) WHERE notification_id=?')->execute([$scheduled['notificationId']]);
    check(runAdminPublisher($root, $env)===0, '公開CLIの実行');
    $stmt=$pdo->prepare('SELECT realtime_published_at FROM admin_notices WHERE notification_id=?');
    $stmt->execute([$scheduled['notificationId']]);
    check((bool)$stmt->fetchColumn(), '公開時の送信依頼成功を保存');
    [, $list]=requestApi('Notifications/List.php','GET',$sessions['A']);
    check(in_array($scheduled['notificationId'],array_column($list['data']['notifications'],'notificationId')), '公開開始後にAPIから回復');
    $before=count(file($eventFile));
    check(runAdminPublisher($root, $env)===0 && count(file($eventFile))===$before, '公開CLIの再実行で配信済み通知を再送しない');
    $pdo->prepare('UPDATE admin_notices SET end_at=DATE_SUB(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 9 HOUR),INTERVAL 1 MINUTE) WHERE notification_id=?')->execute([$scheduled['notificationId']]);
    [, $list]=requestApi('Notifications/List.php','GET',$sessions['A']);
    check(!in_array($scheduled['notificationId'],array_column($list['data']['notifications'],'notificationId')), '公開終了後は取得不可');
    // 配信先だけを停止し、通知DB保存を巻き戻さず後から回復できることを確認します。
    proc_terminate($processes[0]); proc_close($processes[0]);
    [$status,$offline]=requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],array_merge($base,['target'=>'特定ユーザー','targetId'=>$users['A'],'requestKey'=>$run.'-offline']));
    $stmt=$pdo->prepare('SELECT realtime_published_at FROM admin_notices WHERE notification_id=?');
    $stmt->execute([$offline['notificationId']??0]);
    check($status===200 && $stmt->fetchColumn()===null, '送信先停止中でも保存成功し再送待ちになる');
    [, $list]=requestApi('Notifications/List.php','GET',$sessions['A']);
    check(in_array($offline['notificationId'],array_column($list['data']['notifications'],'notificationId')), '送信失敗中の通知をAPIから回復');
    $processes[0]=proc_open([PHP_BINARY,'-S','127.0.0.1:18093',__DIR__.'/emit_stub.php'],[0=>['file','/dev/null','r'],1=>['file','/dev/null','w'],2=>['file','/dev/null','w']],$pipes,$root,$env);
    usleep(200000);
    check(runAdminPublisher($root, $env)===0, '配信先復帰後にCLIで再送できる');
    [$status]=requestApi('Admin/index.php?resource=notices&id='.$offline['id'],'DELETE',$sessions['admin']);
    [, $list]=requestApi('Notifications/List.php','GET',$sessions['A']);
    check($status===200 && !in_array($offline['notificationId'],array_column($list['data']['notifications'],'notificationId')), 'お知らせ削除後は通知も取得不可');
    // 日本時間で公開中の入力を、UTCのRDS接続でも即時表示できることを確認します。
    $jstStart=$pdo->query('SELECT DATE_SUB(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 9 HOUR),INTERVAL 1 MINUTE)')->fetchColumn();
    $jstEnd=$pdo->query('SELECT DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 HOUR)')->fetchColumn();
    [$status,$timed]=requestApi('Admin/index.php?resource=notices','POST',$sessions['admin'],array_merge($base,['target'=>'特定ユーザー','targetId'=>$users['A'],'startAt'=>$jstStart,'endAt'=>$jstEnd,'requestKey'=>$run.'-timezone']));
    [, $list]=requestApi('Notifications/List.php','GET',$sessions['A']);
    $row=current(array_filter($list['data']['notifications'],fn($n)=>$n['notificationId']===$timed['notificationId']));
    check($status===200 && $row && str_ends_with($row['createdAt'],'+00:00'), 'JSTの公開中通知をUTC接続で表示し、作成日時にUTCを明示');
    $stmt=$pdo->prepare('SELECT TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),expires_at) FROM notifications WHERE notification_id=?');
    $stmt->execute([$timed['notificationId']]);
    $seconds=(int)$stmt->fetchColumn();
    check($seconds>3500 && $seconds<=3600, 'JSTの公開終了を通知本体のUTC期限へ換算');
    $events=array_map(fn($line)=>json_decode($line,true),file($eventFile));
    $userEvents=array_values(array_filter($events,fn($event)=>$event['event']==='notification_created'));
    check(count($userEvents)>0 && count(array_filter($userEvents,fn($event)=>isset($event['data']['body'])||isset($event['data']['title'])))===0, '送信依頼はuserルーム宛のIDだけで、本文を含めない');
    echo "注意: HTTP emit先はスタブです。WebSocket接続認証・実ブラウザ受信はこのテストの対象外です。\n";
} catch (Throwable $error) {
    echo "FAIL: ", $error instanceof PDOException ? 'DB検証エラー（詳細は非公開）' : $error->getMessage(), "\n";
    $exitCode=1;
} finally {
    foreach($processes as $process) if(is_resource($process)) {proc_terminate($process);proc_close($process);}
    // この実行専用の作成者IDで限定し、既存ユーザーの通知には触れません。
    if(isset($users['admin'])) {
        $pdo->prepare('DELETE FROM admin_notices WHERE created_by=?')->execute([$users['admin']]);
        $pdo->prepare('DELETE FROM notifications WHERE created_by=?')->execute([$users['admin']]);
    }
    foreach($users as $id) {
        $pdo->prepare('DELETE FROM group_members WHERE user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM admin_users WHERE user_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM users WHERE user_id=?')->execute([$id]);
    }
    if($groupId) $pdo->prepare('DELETE FROM user_groups WHERE group_id=?')->execute([$groupId]);
    foreach($sessions as $session) @unlink(session_save_path().'/sess_'.$session);
    @unlink($eventFile);
}
exit($exitCode);
