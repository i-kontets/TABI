/**
 * 宿泊導線と認証画面をローカルの実ブラウザで検証します。
 * 起動済みpreviewへ接続→全APIをテスト用応答に置換→操作とURL・通信を確認します。
 * 本番接続、DB更新、アカウント作成、実メッセージ送信は行いません。実認証の保証には使えません。
 */
import { createRequire } from 'node:module';
import process from 'node:process';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)(process.env.TABI_PLAYWRIGHT_MODULE);
const origin = 'http://127.0.0.1:4178';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
let authenticated = true;
let admin = false;
const requests = [];
const errors = [];
const candidate = { candidate_id: 42, candidate_type: 'hotel', candidate_name: '検証コテージ', description: 'ブラウザ内だけの検証データ', status: 'selected' };
const candidates = [candidate, { ...candidate, candidate_id: 43, candidate_name: '検証ホテル' }, { ...candidate, candidate_id: 44, candidate_type: 'spot', candidate_name: '検証スポット' }];
const user = () => ({ user_id: 7, name: '検証ユーザー', email: 'fixture@example.invalid', is_tabi_admin: admin });

// 外部通信を遮断し、実APIへの書き込みは一切送信しません。
await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.includes('/api/')) return route.continue();
    requests.push({ path: url.pathname, query: url.search, method: route.request().method() });
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const path = url.pathname;
    if (path.endsWith('/status.php')) return json({ success: true, available: true });
    if (path.endsWith('/WebSocketToken.php')) return json({ success: false }, 401);
    if (path.endsWith('/login.php')) {
        const input = route.request().postDataJSON();
        if (input.password !== 'fixture-pass') return json({ success: false, message: 'メールアドレスまたはパスワードが違います' }, 401);
        authenticated = true;
        return json({ success: true, user: user() });
    }
    if (path.endsWith('/whoami.php')) return authenticated ? json({ success: true, user: user() }) : json({ success: false }, 401);
    if (path.endsWith('/GetCandidates.php')) return authenticated ? json({ success: true, candidates, trip: { title: '検証旅行' } }) : json({ success: false }, 401);
    if (path.endsWith('/Groups/List.php')) return json({ success: true, groups: [{ id: 17, name: '検証旅行' }] });
    if (path.endsWith('/TripInfo.php')) return json({ success: true, trip: { title: '検証旅行', group_id: 17 }, group: { group_name: '検証旅行' } });
    if (path.endsWith('/Members.php')) return json({ success: true, members: [] });
    if (path.endsWith('/CottageChat/List.php')) return authenticated ? json({ success: true, contacts: url.searchParams.get('candidate_id') === '42'
        ? [{ id: 81, name: '検証コテージ', manager_name: '検証相手', stay_period: '', people_count: 2 }] : [] }) : json({ success: false }, 401);
    if (path.endsWith('/CottageChat/Messages.php')) return json({ success: true, chat_id: 81, messages: [] });
    if (path.endsWith('/CottageChat/Read.php')) return json({ success: true, reads: [] });
    return json({ success: true, items: [], contacts: [], groups: [], messages: [], surveys: [], schedules: [], sections: [], invoices: [], unread_count: 0, data: {} });
});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
const go = (path) => page.goto(`${origin}/TABI${path}`);
const check = (ok, name) => { assert.ok(ok, name); console.log('PASS: ' + name); };
const visible = async (text) => page.getByText(text, { exact: true }).first().waitFor();

try {
    await go('/');
    check(await page.locator('input[type=email]').inputValue() === '', '一般ログインのメールは空');
    check(await page.locator('input[type=password]').inputValue() === '', '一般ログインのパスワードは空');
    await page.getByRole('link', { name: 'コテージ管理者の方はこちら' }).click();
    await visible('コテージ管理者ログイン');
    check(await page.getByRole('button', { name: 'ログイン（準備中）' }).isDisabled(), '専用ログインは未接続・送信無効');
    await page.getByRole('link', { name: '未登録の方はこちら' }).click();
    check(await page.getByRole('button', { name: '新規登録（準備中）' }).isDisabled(), '専用登録は未接続・送信無効');
    await page.reload();
    await visible('コテージ管理者の新規登録');
    await page.screenshot({ path: '/tmp/tabi-owner-mobile.png', fullPage: true });
    await page.getByRole('link', { name: 'コテージ管理者ログインへ' }).click();
    await page.getByRole('link', { name: '一般ユーザーのログイン画面へ戻る' }).click();
    await page.getByRole('button', { name: '新規登録', exact: true }).click();
    check(page.url().includes('/Newreg'), '一般ユーザーの登録入口を維持');

    await go('/Home');
    await page.getByRole('combobox').selectOption('17');
    await page.screenshot({ path: '/tmp/tabi-home-mobile.png', fullPage: true });
    await page.getByRole('link', { name: 'しおり', exact: true }).click();
    await page.getByRole('button', { name: '候補を見る' }).click();
    await page.getByRole('button', { name: '⌂ 宿泊先' }).click();
    await page.reload();
    await page.getByRole('button', { name: '宿泊一覧を見る' }).click();
    await visible('宿泊一覧');
    check(new URL(page.url()).searchParams.get('groupId') === '17', 'しおり→候補→宿泊→一覧のグループ引継ぎ');
    await page.reload();
    await visible('検証コテージ');
    check(await page.getByText('検証スポット', { exact: true }).count() === 0, '再読み込みでも宿泊タブを保持');
    await page.getByRole('button', { name: '詳細を見る' }).first().click();
    await visible('検証コテージ');
    await page.reload();
    await visible('検証コテージ');
    const before = requests.length;
    await page.getByRole('button', { name: '予約画面へ' }).click();
    await visible('ハローワールド');
    check(await page.locator('main').innerText() === 'ハローワールド', '予約本文は正確にハローワールドだけ');
    check(!requests.slice(before).some((r) => /reserv|payment|booking|vacan/i.test(r.path)), '予約・決済・空室API通信なし');
    await page.goBack();
    await visible('検証コテージ');
    await page.goForward();
    await visible('ハローワールド');
    check(true, 'ブラウザの戻る・進むでも選択施設と予約ページを維持');
    await page.reload();
    await visible('ハローワールド');
    await page.screenshot({ path: '/tmp/tabi-reservation-mobile.png', fullPage: true });
    await page.getByRole('link', { name: '施設詳細へ戻る' }).click();
    await page.getByRole('button', { name: '予約前チャット・問い合わせ' }).click();
    await page.locator('.chat-title').filter({ hasText: '検証コテージ' }).waitFor();
    check(requests.some((r) => r.path.endsWith('/CottageChat/List.php') && r.query.includes('candidate_id=42') && r.query.includes('groupId=17')), '対象施設・グループを施設チャットAPIへ渡す');
    check(requests.some((r) => r.path.endsWith('/CottageChat/Messages.php') && r.query.includes('chat_id=81')), '既存の対象施設会話を開く');
    const invalidChatStart = requests.length;
    await go('/CottageChatPage?candidate_id=42&groupId=17&chat_id=invalid');
    await page.locator('.chat-item').waitFor();
    check(!requests.slice(invalidChatStart).some((r) => r.path.endsWith('/CottageChat/Messages.php')), '不正な会話IDを別会話で代用しない');
    await go('/CottageChatPage?candidate_id=43&groupId=17');
    await page.getByText('この施設の参加可能な会話はありません。', { exact: false }).waitFor();
    check(await page.locator('button[aria-label="送信"]').isDisabled(), '未開設施設は送信できず別会話へ接続しない');
    await go('/Candidates/43?groupId=17');
    await page.getByRole('button', { name: '予約画面へ' }).click();
    await visible('ハローワールド');
    check(page.url().includes('/Candidates/43/reservation'), 'ホテルも施設IDを保って予約ページへ');

    for (const [label, target] of [['話し合い', '/group/17/talk'], ['スケジュール', '/schedule'], ['宿泊一覧', '/Candidates'], ['持ち物', '/CheckList'], ['その他', '/Other']]) {
        await go('/Home');
        await page.getByRole('combobox').selectOption('17');
        await page.getByRole('link', { name: label, exact: true }).click();
        check(new URL(page.url()).pathname.endsWith(target), 'Home→' + label);
    }
    await go('/Candidates');
    await visible('旅行グループを選択してください。');
    check(await page.getByRole('link', { name: 'ホームへ' }).isVisible(), 'グループ未選択の案内');

    authenticated = false;
    await go('/admin');
    await page.waitForURL('**/TABI/?returnTo=*');
    await page.locator('input[type=email]').fill('241admin@gmail.com');
    await page.locator('input[type=password]').fill('incorrect');
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await visible('メールアドレスまたはパスワードが違います');
    check(!new URL(page.url()).pathname.includes('/admin'), '認証失敗は管理画面へ移動しない（モックAPI）');
    await page.locator('input[type=password]').fill('fixture-pass');
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await page.waitForURL('**/Home');
    check(true, '一般認証でadmin復帰先を指定してもHomeへ（モックAPI）');
    await page.evaluate(() => localStorage.setItem('loginUser', JSON.stringify({ is_tabi_admin: true, user_id: 1 })));
    await go('/admin');
    await visible('TABI全体の管理者権限がありません。');
    check(true, 'localStorage改変でもサーバー応答の権限なしを表示（モックAPI）');
    admin = true;
    await go('/');
    await page.locator('input[type=email]').fill('241admin@gmail.com');
    await page.locator('input[type=password]').fill('fixture-pass');
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await page.waitForURL('**/admin');
    check(true, '正規管理者応答で共通ログインからadminへ（モックAPI）');
    authenticated = false;
    await page.reload();
    await page.waitForURL('**/TABI/?returnTo=*');
    check(true, 'セッション失効後の再読み込みで共通ログインへ（モックAPI）');
    for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const path of ['/', '/CottageOwner/login', '/CottageOwner/register', '/Candidates/42/reservation?groupId=17']) {
            await go(path);
            check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}px幅で横溢れなし: ${path}`);
        }
    }
    check(!requests.some((r) => /\/(Send|register)\.php$/i.test(r.path)), '登録・チャット送信要求なし');
    check(errors.length === 0, 'ページ例外なし: ' + errors.join('; '));
} finally {
    await browser.close();
}
