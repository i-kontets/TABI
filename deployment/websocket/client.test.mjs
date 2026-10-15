import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createAuthenticatedSocket } from '../../src/api/authenticatedSocket.js';

// fetch/Socketを境界で置き換え、秘密値を保存せずReact共通接続処理の競合を検証します。
function setup(request) {
    let options, count=0, value;
    const engine=new EventEmitter();
    engine.connected=false;
    engine.connect=()=>{count++;options.auth(auth=>{value=auth;engine.connected=true;engine.emit('connect');});return engine;};
    engine.disconnect=()=>{engine.connected=false;engine.emit('disconnect','io client disconnect');return engine;};
    const socket=createAuthenticatedSocket({request,ioFactory:(_url,config)=>{options=config;return engine;}});
    return {socket,get count(){return count;},get auth(){return value;}};
}
const tick=()=>new Promise(r=>setTimeout(r,20));
test('接続ごとにSession tokenを取得しroomだけ送る',async()=>{
    const requests=[]; const c=setup(async(_url,opts)=>{requests.push(opts);return {ok:true,status:200,json:async()=>({token:'test-only-token',userId:2})};});
    c.socket.setRequestedRooms(['trip:10']);c.socket.connect();await tick();
    assert.equal(c.auth.token,'test-only-token');
    assert.equal(c.socket.authenticatedUserId,2);
    assert.deepEqual(JSON.parse(requests[0].body),{rooms:['trip:10']});assert.equal(requests[0].credentials,'include');
    c.socket.disconnect();c.socket.connect();await tick();assert.equal(requests.length,2);c.socket.disconnect();
});
test('logout中に到着した古いtokenで接続しない',async()=>{
    let done;const c=setup(()=>new Promise(r=>{done=r;}));c.socket.connect();c.socket.disconnect();
    done({ok:true,status:200,json:async()=>({token:'obsolete-test-token'})});await tick();assert.equal(c.auth,undefined);
});
test('401後は接続を停止し自動再試行しない',async()=>{
    const c=setup(async()=>({status:401}));c.socket.connect();await tick();assert.equal(c.socket.connected,false);assert.equal(c.auth,undefined);c.socket.disconnect();
});
test('room変更時は旧接続を閉じて再認可する',async()=>{
    const requests=[];const c=setup(async(_url,opts)=>{requests.push(JSON.parse(opts.body));return {ok:true,status:200,json:async()=>({token:'test-token'})};});
    c.socket.connect();await tick();c.socket.setRequestedRooms(['trip:20']);await tick();
    assert.deepEqual(requests,[{rooms:[]},{rooms:['trip:20']}]);c.socket.disconnect();
});
test('期限切れのサーバー切断で新tokenを取得する',async()=>{
    let calls=0;const c=setup(async()=>{calls++;return {ok:true,status:200,json:async()=>({token:'test-token'})};});
    c.socket.connect();await tick();c.socket.connected=false;c.socket.emit('disconnect','io server disconnect');
    await new Promise(r=>setTimeout(r,1100));assert.equal(calls,2);c.socket.disconnect();
});
