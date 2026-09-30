<?php
declare(strict_types=1);

// ローカルDockerだけで実行し、独立したユーザー・所属・Sessionを最後に消します。
if (PHP_SAPI !== 'cli' || getenv('DB_HOST') !== 'db' || getenv('DB_NAME') !== 'tabi') exit(1);
// 検証結果を先に表示しても、後続のテスト用Session作成のヘッダーを妨げないようにします。
ob_start();
require dirname(__DIR__) . '/WebSocketAuth.php';
$p=new PDO('mysql:host=db;dbname=tabi;charset=utf8mb4',getenv('DB_USER'),getenv('DB_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$users=[];$groups=[];$sessions=[];$chat=null;$process=null;$checks=0;$secretFile=null;
$secret=bin2hex(random_bytes(48));$run=bin2hex(random_bytes(12));
function check(bool $ok,string $label):void {global $checks;if(!$ok)throw new RuntimeException($label);$checks++;echo "PASS: $label\n";}
function callToken(?string $session,array $body=['rooms'=>[]],?string $origin=null):array {
    $c=curl_init('http://127.0.0.1:18096/TABI/api/auth/WebSocketToken.php');
    $headers=['Content-Type: application/json'];if($session)$headers[]='Cookie: PHPSESSID='.$session;if($origin)$headers[]='Origin: '.$origin;
    curl_setopt_array($c,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body),CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>3]);
    $raw=curl_exec($c);$status=curl_getinfo($c,CURLINFO_HTTP_CODE);curl_close($c);return [$status,json_decode((string)$raw,true)];
}
try {
    // 本番値を使わず、公開外ファイル読取と公開権限の拒否をローカルで検証します。
    $originalSecret=getenv('WS_AUTH_SECRET');putenv('WS_AUTH_SECRET');
    $secretFile=tempnam(sys_get_temp_dir(),'tabi-ws-auth-');
    file_put_contents($secretFile,$secret."\n");chmod($secretFile,0600);
    check(wsReadAuthSecret($secretFile)===$secret,'公開外の権限600の秘密ファイルを読取');
    chmod($secretFile,0644);clearstatcache(true,$secretFile);
    check(wsReadAuthSecret($secretFile)==='','他ユーザーが読める秘密ファイルを拒否');
    chmod($secretFile,0600);clearstatcache(true,$secretFile);
    $override=bin2hex(random_bytes(48));putenv('WS_AUTH_SECRET='.$override);
    check(wsReadAuthSecret($secretFile)===$override,'明示的なサーバー環境変数を優先');
    putenv('WS_AUTH_SECRET');check(wsReadAuthSecret($secretFile.'.missing')==='','秘密設定不在では空値で拒否');
    putenv($originalSecret===false?'WS_AUTH_SECRET':'WS_AUTH_SECRET='.$originalSecret);
    foreach(['admin','member','other','pending','inactive','deleted'] as $role){
        $p->prepare("INSERT INTO users(name,email,password_hash,status,created_at,updated_at) VALUES (?,?,'unusable-test-hash','active',NOW(),NOW())")->execute(['WS認可検証',$run.$role.'@example.invalid']);
        $users[$role]=(int)$p->lastInsertId();$sid=bin2hex(random_bytes(24));$sessions[$role]=$sid;
        session_id($sid);session_start();$_SESSION=['user_id'=>$users[$role]];session_write_close();
    }
    $p->prepare('INSERT INTO admin_users(user_id,admin_level,created_at) VALUES (?,1,NOW())')->execute([$users['admin']]);
    $p->prepare("UPDATE users SET status='suspended' WHERE user_id=?")->execute([$users['inactive']]);
    $p->prepare('UPDATE users SET deleted_at=NOW() WHERE user_id=?')->execute([$users['deleted']]);
    foreach(['active','inactive'] as $state){
        $p->prepare('INSERT INTO user_groups(group_name,created_by,status,created_at,updated_at) VALUES (?,?,?,NOW(),NOW())')->execute(['WS認可検証',$users['admin'],$state]);
        $groups[$state]=(int)$p->lastInsertId();
        $p->prepare("INSERT INTO group_members(group_id,user_id,invitation_status) VALUES (?,?,'accepted')")->execute([$groups[$state],$users['member']]);
    }
    $p->prepare("INSERT INTO group_members(group_id,user_id,invitation_status) VALUES (?,?,'pending')")->execute([$groups['active'],$users['pending']]);
    $chat=(int)$p->query('SELECT COALESCE(MAX(chat_id),0)+1 FROM chats')->fetchColumn();
    $p->prepare("INSERT INTO chats(chat_id,chat_type,created_at) VALUES (?,'hotel',NOW())")->execute([$chat]);
    $p->prepare('INSERT INTO chat_members(chat_id,user_id,joined_at) VALUES (?,?,NOW())')->execute([$chat,$users['member']]);
    $requested=['trip:'.$groups['active'],'trip:'.$groups['inactive'],'cottage:'.$chat];
    $rooms=wsAllowedRooms($p,$users['member'],$requested);
    check(in_array('trip:'.$groups['active'],$rooms,true),'所属グループを許可');
    check(!in_array('trip:'.$groups['inactive'],$rooms,true),'停止グループを拒否');
    check(in_array('cottage:'.$chat,$rooms,true),'ホテルチャット参加者を許可');
    check(count(wsAllowedRooms($p,$users['other'],$requested))===1,'非所属trip/cottageは本人room以外を付与しない');
    check(count(wsAllowedRooms($p,$users['pending'],$requested))===1,'招待待ちのtrip参加を拒否');
    check(in_array('admin:global',wsAllowedRooms($p,$users['admin'],[]),true),'閲覧権限level1の管理者を許可');
    check(!in_array('admin:global',$rooms,true),'一般ユーザーに管理者claimを付与しない');
    foreach(['inactive','deleted'] as $role){$denied=false;try{wsAllowedRooms($p,$users[$role],[]);}catch(DomainException){$denied=true;}check($denied,$role.'ユーザーを拒否');}
    foreach([['user:999'],array_fill(0,9,'trip:1'),['trip:01'],[['trip'=>1]]] as $bad){$denied=false;try{wsAllowedRooms($p,$users['member'],$bad);}catch(InvalidArgumentException){$denied=true;}check($denied,'不正room・上限超過を拒否');}
    $signed=wsIssueToken($users['member'],$rooms,$secret);[$body,$sig]=explode('.',$signed['token']);
    $claims=json_decode(base64_decode(strtr($body,'-_','+/')),true);
    check($claims['exp']-$claims['iat']===120 && strlen($claims['nonce'])===32,'TTL120秒・nonceを設定');
    $expected=rtrim(strtr(base64_encode(hash_hmac('sha256','tabi-ws-v1.'.$body,$secret,true)),'+/','-_'),'=');
    check(hash_equals($expected,$sig),'署名と用途固定prefixが一致');
    $env=array_merge(getenv(),['WS_AUTH_SECRET'=>$secret]);
    $process=proc_open([PHP_BINARY,'-S','127.0.0.1:18096','-t','/var/www/html'],[0=>['file','/dev/null','r'],1=>['file','/dev/null','w'],2=>['file','/dev/null','w']],$pipes,null,$env);
    usleep(300000);
    [$status]=callToken(null);check($status===401,'未ログインAPIは401');
    [$status,$response]=callToken($sessions['member'],['rooms'=>$requested,'user_id'=>$users['admin'],'role'=>'admin']);
    check($status===200,'正規Sessionからtokenを発行');
    $claims=json_decode(base64_decode(strtr(explode('.',$response['token'])[0],'-_','+/')),true);
    check($claims['sub']===(string)$users['member']&&!in_array('admin:global',$claims['rooms'],true),'送信されたuser_id/roleを信用しない');
    [$status]=callToken($sessions['member'],['rooms'=>[]],'https://untrusted.invalid');check($status===403,'cross-origin発行を拒否');
    [$status]=callToken($sessions['deleted']);check($status===401,'削除済みSessionは401');
    [$status]=callToken($sessions['member'],['rooms'=>['admin:global']]);check($status===422,'クライアントによるadmin room指定を拒否');
    echo "TOTAL PASS: $checks\n";
} catch(Throwable $e){fwrite(STDERR,'FAIL: '.get_class($e)."（秘密値・例外詳細は非表示）\n");$failed=true;}
finally {
    if($secretFile)@unlink($secretFile);
    if(is_resource($process)){proc_terminate($process);proc_close($process);}
    if($chat){$p->prepare('DELETE FROM chat_members WHERE chat_id=?')->execute([$chat]);$p->prepare('DELETE FROM chats WHERE chat_id=?')->execute([$chat]);}
    foreach($groups as $id){$p->prepare('DELETE FROM group_members WHERE group_id=?')->execute([$id]);$p->prepare('DELETE FROM user_groups WHERE group_id=?')->execute([$id]);}
    foreach($users as $id){$p->prepare('DELETE FROM admin_users WHERE user_id=?')->execute([$id]);$p->prepare('DELETE FROM users WHERE user_id=?')->execute([$id]);}
    foreach($sessions as $sid)@unlink((session_save_path()?:sys_get_temp_dir()).'/sess_'.$sid);
}
exit(!empty($failed)?1:0);
