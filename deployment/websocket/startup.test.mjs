import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// PM2のラッパーからimportされる起動形を別プロセスで再現します。
// 認可試験では通らない入口の不具合を検出し、待受は検証用loopbackへ強制します。
test('PM2実行対象パスで起動し、HTTP待受を開始する', async () => {
    const entry = new URL('./server.mjs', import.meta.url);
    const wrapper = `
        import http from 'node:http';
        const listen = http.Server.prototype.listen;
        http.Server.prototype.listen = function () {
            return listen.call(this, 0, '127.0.0.1', () => console.log('TEST_PORT=' + this.address().port));
        };
        process.argv[1] = '/test/ProcessContainerFork.js';
        await import(${JSON.stringify(entry.href)});
    `;
    const child = spawn(process.execPath, ['--input-type=module', '-e', wrapper], {
        env: { ...process.env, pm_exec_path: fileURLToPath(entry),
            WS_AUTH_SECRET: randomBytes(48).toString('hex'), REALTIME_SECRET: randomBytes(48).toString('hex'), PORT: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
        const port = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('PM2形式の起動で待受が始まらない')), 4000);
            let output = '';
            child.stdout.on('data', data => {
                output += data;
                const match = /TEST_PORT=(\d+)/.exec(output);
                if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
            });
            child.on('exit', () => { clearTimeout(timeout); reject(new Error('待受開始前に終了')); });
        });
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).ok, true);
    } finally {
        child.kill();
    }
});
