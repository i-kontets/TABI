"""許可済みのLightsail非稼働領域だけへ候補を置き、既存プロセス不変を照合する。

本番server.js/.env/PM2/Nginxへ書き込まず、npm installや再起動を行わない。
"""
import io
import json
import shlex
import subprocess
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['server.mjs', 'auth.mjs', 'auth.test.mjs', 'package.json', 'package-lock.json']
REMOTE = r'''
import hashlib,io,json,os,subprocess,sys,tarfile
from pathlib import Path
from datetime import datetime,timezone
live=Path('/home/ubuntu/tabi-ws-server')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def processes():
 result=[]
 for p in Path('/proc').iterdir():
  if not p.name.isdigit():continue
  try:
   if os.readlink(p/'cwd')!=str(live):continue
   comm=(p/'comm').read_text().strip()
   if 'node' in comm.lower() or 'pm2' in comm.lower():result.append({'pid':int(p.name),'startTicks':(p/'stat').read_text().rsplit(')',1)[1].split()[19]})
  except OSError:pass
 return sorted(result,key=lambda x:x['pid'])
before=processes();original=sha(live/'server.js');env_before=sha(live/'.env')
if not before:raise SystemExit('No live process evidence; staging aborted')
directory=Path('/home/ubuntu/tabi-ws-staging')/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ-auth')
os.umask(0o077);directory.mkdir(parents=True,exist_ok=False)
expected={'server.mjs','auth.mjs','auth.test.mjs','package.json','package-lock.json'}
archive=tarfile.open(fileobj=io.BytesIO(sys.stdin.buffer.read()),mode='r:gz')
members=archive.getmembers()
if len(members)!=len(expected) or {m.name for m in members}!=expected or any(not m.isfile() or m.size>1000000 for m in members):raise SystemExit('Invalid staging archive')
for member in members:
 (directory/member.name).write_bytes(archive.extractfile(member).read())
# 退避するのは既知のサーバーソースだけです。.envや秘密鍵はコピーしません。
(directory/'server.js.before').write_bytes((live/'server.js').read_bytes())
(directory/'node_modules').symlink_to(live/'node_modules',target_is_directory=True)
checks=[]
for name in ['server.mjs','auth.mjs','auth.test.mjs']:
 r=subprocess.run(['node','--check',str(directory/name)],capture_output=True,text=True,timeout=15)
 checks.append({'file':name,'exitCode':r.returncode})
 if r.returncode:raise SystemExit('Syntax check failed')
# テストは使い捨てメモリ鍵と127.0.0.1の動的ポートだけを使います。
test_env={k:v for k,v in os.environ.items() if k not in ['WS_AUTH_SECRET','REALTIME_SECRET','PORT','NODE_OPTIONS','WS_TEST_PHP']}
test=subprocess.run(['node','--test',str(directory/'auth.test.mjs')],cwd=directory,env=test_env,capture_output=True,text=True,timeout=45)
unchanged=before==processes() and original==sha(live/'server.js') and env_before==sha(live/'.env')
report={'directory':str(directory),'liveUnchanged':unchanged,'processesBefore':before,'processesAfter':processes(),'syntax':checks,'testExitCode':test.returncode,'files':{name:sha(directory/name) for name in sorted(expected)},'originalSourceSha256':original}
(directory/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
(directory/'test-results.txt').write_text(test.stdout+test.stderr)
print(json.dumps(report));print(test.stdout);print(test.stderr)
if test.returncode or not unchanged:raise SystemExit(1)
'''


def main():
    payload = io.BytesIO()
    with tarfile.open(fileobj=payload, mode='w:gz') as tar:
        for name in FILES:
            tar.add(ROOT / 'deployment/websocket' / name, arcname=name, recursive=False)
    command = ['ssh', '-i', str(Path.home() / 'Downloads/LightsailDefaultKey-ap-northeast-1.pem'),
               '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new',
               '-o', 'UserKnownHostsFile=/dev/null', '-o', 'UpdateHostKeys=no',
               'ubuntu@57.180.211.158', 'python3 -c ' + shlex.quote(REMOTE)]
    result = subprocess.run(command, input=payload.getvalue(), capture_output=True)
    print(result.stdout.decode())
    if result.returncode:
        print('ステージング検証失敗。本番切り替えはしていません。')
    raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
