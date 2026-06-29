/**
 * TABI コテージ管理ダッシュボード — メインJavaScript
 * LINE風リアルタイムチャット（SSE + ポーリングフォールバック）
 */

'use strict';

const API = './api';

// ─── アプリ状態 ────────────────────────────────────
let currentUser = null;
let chats = [];       // チャット一覧
let activeChatId = null;     // 選択中chat_id
let lastMsgId = 0;        // 最後に受信したmessage_id
let isSending = false;

let eventSource = null;     // SSE接続
let pollTimer = null;     // ポーリングタイマー
let listTimer = null;     // 一覧更新タイマー
let readTimer = null;     // 既読状態ポーリングタイマー

// ─── DOM参照 ───────────────────────────────────────
const loginScreen = document.getElementById('loginScreen');
const registerScreen = document.getElementById('registerScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const loginErr = document.getElementById('loginErr');
const loginBtn = document.getElementById('loginBtn');
const emailInput = document.getElementById('emailInput');
const passInput = document.getElementById('passInput');
const toRegisterBtn = document.getElementById('toRegisterBtn');
const toLoginBtn = document.getElementById('toLoginBtn');
const registerForm = document.getElementById('registerForm');
const registerErr = document.getElementById('registerErr');
const registerOk = document.getElementById('registerOk');
const registerBtn = document.getElementById('registerBtn');
const regNameInput = document.getElementById('regNameInput');
const regEmailInput = document.getElementById('regEmailInput');
const regPassInput = document.getElementById('regPassInput');
const regChatIdInput = document.getElementById('regChatIdInput');
const hdUser = document.getElementById('hdUser');
const logoutBtn = document.getElementById('logoutBtn');
const chatListEl = document.getElementById('chatList');
const listPane = document.getElementById('listPane');
const chatPane = document.getElementById('chatPane');
const emptyState = document.getElementById('emptyState');
const chatHeader = document.getElementById('chatHeader');
const chatTitle = document.getElementById('chatTitle');
const chatSub = document.getElementById('chatSub');
const connBadge = document.getElementById('connBadge');
const msgArea = document.getElementById('msgArea');
const msgList = document.getElementById('msgList');
const msgEnd = document.getElementById('msgEnd');
const inputArea = document.getElementById('inputArea');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const sendErr = document.getElementById('sendErr');
const backBtn = document.getElementById('backToListBtn');
const imageBtn = document.getElementById('imageBtn');
const imageFileInput = document.getElementById('imageFileInput');

// ─── 初期化 ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    bindEvents();
});

function bindEvents() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    msgForm.addEventListener('submit', handleSend);
    msgInput.addEventListener('input', () => {
        sendBtn.disabled = msgInput.value.trim() === '' || isSending;
    });
    imageBtn.addEventListener('click', () => { if (!isSending) imageFileInput.click(); });
    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) { handleImageSend(file); e.target.value = ''; }
    });
    // テキストエリア自動伸縮
    msgInput.addEventListener('input', () => {
        msgInput.style.height = 'auto';
        msgInput.style.height = `${msgInput.scrollHeight}px`;
    });
    // Enter 送信 / Shift+Enter 改行
    msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (msgInput.value.trim() && !isSending) {
                msgForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }
    });
    backBtn.addEventListener('click', () => {
        chatPane.classList.remove('open');
        activeChatId = null;
        stopRealtime();
    });
    // 画面切り替えボタン
    toRegisterBtn.addEventListener('click', showRegister);
    toLoginBtn.addEventListener('click', showLogin);
    // 新規登録フォーム
    registerForm.addEventListener('submit', handleRegister);
}

// ─── 認証チェック ──────────────────────────────────
async function checkAuth() {
    try {
        const res = await apiFetch('whoami.php');
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            showApp();
        } else {
            showLogin();
        }
    } catch {
        showLogin();
    }
}

// ─── ログイン ──────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    loginErr.hidden = true;
    loginBtn.disabled = true;
    loginBtn.textContent = 'ログイン中…';

    try {
        const res = await apiFetch('login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                password: passInput.value,
            }),
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            showApp();
        } else {
            showLoginError(data.message || 'ログインに失敗しました');
        }
    } catch {
        showLoginError('通信エラーが発生しました');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'ログイン';
    }
}

function showLoginError(msg) {
    loginErr.textContent = msg;
    loginErr.hidden = false;
}

// ─── 新規登録 ──────────────────────────────────────
async function handleRegister(e) {
    e.preventDefault();
    registerErr.hidden = true;
    registerOk.hidden = true;
    registerBtn.disabled = true;
    registerBtn.textContent = '登録中…';

    try {
        const res = await apiFetch('register.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: regNameInput.value.trim(),
                email: regEmailInput.value.trim(),
                password: regPassInput.value,
                chat_id: parseInt(regChatIdInput.value, 10),
            }),
        });
        const data = await res.json();

        if (data.success) {
            registerOk.textContent = data.message || '登録が完了しました。ログインしてください。';
            registerOk.hidden = false;
            registerForm.reset();
            // 2秒後にログイン画面へ
            setTimeout(() => showLogin(), 2000);
        } else {
            registerErr.textContent = data.message || '登録に失敗しました';
            registerErr.hidden = false;
        }
    } catch {
        registerErr.textContent = '通信エラーが発生しました';
        registerErr.hidden = false;
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = '登録する';
    }
}

// ─── ログアウト ────────────────────────────────────
async function handleLogout() {
    stopRealtime();
    clearInterval(listTimer);
    try { await apiFetch('logout.php', { method: 'GET' }); } catch { /* ignore */ }
    currentUser = null;
    activeChatId = null;
    showLogin();
}

// ─── 画面切り替え ──────────────────────────────────
function showLogin() {
    appScreen.classList.add('hidden');
    registerScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    passInput.value = '';
}

function showRegister() {
    loginScreen.classList.add('hidden');
    appScreen.classList.add('hidden');
    registerScreen.classList.remove('hidden');
    registerErr.hidden = true;
    registerOk.hidden = true;
    registerForm.reset();
}

function showApp() {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    hdUser.textContent = currentUser?.name || '';
    loadChatList();

    // 30秒おきに一覧を更新（未読カウント）
    clearInterval(listTimer);
    listTimer = setInterval(loadChatList, 30000);
}

// ─── チャット一覧 ──────────────────────────────────
async function loadChatList() {
    try {
        const res = await apiFetch('chat_list.php');
        const data = await res.json();
        if (!data.success) return;

        chats = data.chats || [];
        renderChatList();
    } catch { /* silent */ }
}

function renderChatList() {
    if (chats.length === 0) {
        chatListEl.innerHTML = '<p class="loading-txt">チャットがありません</p>';
        return;
    }

    chatListEl.innerHTML = '';
    chats.forEach(c => {
        const item = document.createElement('div');
        item.className = 'chat-item' + (c.chat_id === activeChatId ? ' active' : '');
        item.dataset.chatId = c.chat_id;

        const avatar = (c.stay_name || c.trip_title || '?').slice(0, 1);
        const lastText = c.last_body
            ? `${c.last_sender ? c.last_sender + ': ' : ''}${c.last_body.slice(0, 30)}${c.last_body.length > 30 ? '…' : ''}`
            : 'メッセージなし';

        item.innerHTML = `
      <div class="ci-avatar">${escHtml(avatar)}</div>
      <div class="ci-body">
        <div class="ci-top">
          <span class="ci-title">${escHtml(c.stay_name || 'コテージ')}</span>
          <span class="ci-time">${escHtml(c.last_time)}</span>
        </div>
        <div class="ci-bot">
          <span class="ci-last">${escHtml(lastText)}</span>
          ${c.unread_count > 0 ? `<span class="ci-badge">${c.unread_count}</span>` : ''}
        </div>
      </div>
    `;

        item.addEventListener('click', () => openChat(c));
        chatListEl.appendChild(item);
    });
}

// ─── チャット開く ──────────────────────────────────
async function openChat(chat) {
    if (activeChatId === chat.chat_id) return;

    // 前の接続を停止
    stopRealtime();

    activeChatId = chat.chat_id;
    lastMsgId = 0;

    // UI更新
    emptyState.classList.add('hidden');
    chatHeader.classList.remove('hidden');
    msgArea.classList.remove('hidden');
    inputArea.classList.remove('hidden');
    imageBtn.disabled = false;
    chatPane.classList.add('open'); // モバイル用

    chatTitle.textContent = chat.stay_name || 'コテージ';
    chatSub.textContent = `${chat.trip_title || '旅行'}　${chat.start_date || ''} – ${chat.end_date || ''}`;

    msgList.innerHTML = '';
    setConnBadge('connecting');
    msgInput.value = '';
    sendErr.classList.add('hidden');

    // 一覧のアクティブ状態更新
    renderChatList();

    // 初期メッセージ読み込み
    await loadMessages(chat.chat_id);

    // 既読にする
    markRead(chat.chat_id);

    // リアルタイム開始
    startRealtime(chat.chat_id);
}

// ─── メッセージ取得（初期） ────────────────────────
async function loadMessages(chatId) {
    try {
        const res = await apiFetch(`chat_messages.php?chat_id=${chatId}`);
        const data = await res.json();

        if (!data.success || chatId !== activeChatId) return;

        data.messages.forEach(m => appendMessage(m, false));
        lastMsgId = data.last_message_id || 0;
        scrollBottom();
    } catch { /* silent */ }
}

// ─── リアルタイム接続 ─────────────────────────────
function startRealtime(chatId) {
    if (window.EventSource) {
        connectSSE(chatId);
    } else {
        startPolling(chatId);
    }
    // 既読状態を5秒ごとに確認してUIに反映
    if (readTimer) clearInterval(readTimer);
    readTimer = setInterval(() => updateReadStatus(chatId), 5000);
}

function stopRealtime() {
    if (eventSource) { eventSource.close(); eventSource = null; }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (readTimer) { clearInterval(readTimer); readTimer = null; }
}

// SSE接続
function connectSSE(chatId) {
    if (eventSource) { eventSource.close(); eventSource = null; }

    const url = `${API}/chat_stream.php?chat_id=${chatId}&after_id=${lastMsgId}`;
    let es;
    try { es = new EventSource(url, { withCredentials: true }); }
    catch { startPolling(chatId); return; }

    es.addEventListener('connected', () => {
        if (chatId !== activeChatId) { es.close(); return; }
        setConnBadge('ok');
    });

    es.addEventListener('messages', (e) => {
        if (chatId !== activeChatId) return;
        try {
            const msgs = JSON.parse(e.data);
            let scrolled = false;
            msgs.forEach(m => {
                if (!document.querySelector(`[data-mid="${m.message_id}"]`)) {
                    appendMessage(m, true);
                    if (m.message_id > lastMsgId) lastMsgId = m.message_id;
                    scrolled = true;
                }
            });
            if (scrolled) {
                scrollBottom();
                markRead(chatId);   // 既読にしてから一覧更新
                loadChatList();
            }
        } catch { /* malformed */ }
    });

    es.addEventListener('close', () => {
        es.close();
        if (chatId === activeChatId) {
            setTimeout(() => connectSSE(chatId), 300);
        }
    });

    es.onerror = () => {
        es.close(); eventSource = null;
        if (chatId === activeChatId) {
            setConnBadge('polling');
            startPolling(chatId);
        }
    };

    eventSource = es;
    setConnBadge('ok');
}

// ポーリング（SSEフォールバック）
function startPolling(chatId) {
    if (pollTimer) clearInterval(pollTimer);

    const doPoll = async () => {
        if (chatId !== activeChatId) return;
        try {
            const res = await apiFetch(`chat_since.php?chat_id=${chatId}&after_id=${lastMsgId}`);
            const data = await res.json();

            if (!data.success || chatId !== activeChatId) return;
            if (data.messages.length > 0) {
                data.messages.forEach(m => {
                    if (!document.querySelector(`[data-mid="${m.message_id}"]`)) {
                        appendMessage(m, true);
                        if (m.message_id > lastMsgId) lastMsgId = m.message_id;
                    }
                });
                scrollBottom();
                markRead(chatId);   // 既読にしてから一覧更新
                loadChatList();
            }
        } catch { /* silent */ }
    };

    pollTimer = setInterval(doPoll, 2000);
    setConnBadge('polling');

    // タブ非表示時はポーリング間隔を伸ばす
    document.addEventListener('visibilitychange', () => {
        clearInterval(pollTimer);
        pollTimer = setInterval(doPoll, document.hidden ? 10000 : 2000);
    });
}

// ─── 既読処理 ──────────────────────────────────────
async function markRead(chatId) {
    try {
        await apiFetch('mark_read.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId }),
        });
    } catch { /* silent */ }
}

// 自分が送ったメッセージの既読状態をポーリングしてDOMを更新
async function updateReadStatus(chatId) {
    if (chatId !== activeChatId) return;
    try {
        const res = await apiFetch(`read_status.php?chat_id=${chatId}`);
        const data = await res.json();
        if (!data.success) return;

        const readSet = new Set(data.read_message_ids);
        readSet.forEach(mid => {
            const row = document.querySelector(`[data-mid="${mid}"]`);
            if (!row) return;
            // まだ既読ラベルがなければ追加
            if (!row.querySelector('.read-lbl')) {
                const timeEl = row.querySelector('.meta-me .msg-time');
                if (timeEl) {
                    const lbl = document.createElement('span');
                    lbl.className = 'read-lbl';
                    lbl.textContent = '既読';
                    timeEl.before(lbl);
                }
            }
        });
    } catch { /* silent */ }
}

// ─── メッセージ描画 ────────────────────────────────
let lastRenderedDate = '';

function appendMessage(msg, animate) {
    const isMe = msg.isMine;
    const isMgr = msg.sender_type === 'manager';
    const date = msg.date || '';
    const time = msg.time || '';

    // 日付区切り
    if (date && date !== lastRenderedDate) {
        const div = document.createElement('div');
        div.className = 'date-divider';
        div.innerHTML = `<span class="date-badge">${escHtml(date)}</span>`;
        msgList.appendChild(div);
        lastRenderedDate = date;
    }

    const row = document.createElement('div');
    row.className = `msg-row ${isMe ? 'msg-row-me' : 'msg-row-other'}`;
    row.dataset.mid = msg.message_id;

    const bubbleClass = isMe ? 'bubble-me' : isMgr ? 'bubble-mgr' : 'bubble-other';
    const senderLabel = msg.sender_name || (isMgr ? '管理人' : 'メンバー');
    const avatarClass = `msg-avatar${isMgr ? ' mgr' : ''}`;
    const avatarChar = senderLabel.slice(0, 1);

    row.innerHTML = `
    ${!isMe ? `<div class="${avatarClass}">${escHtml(avatarChar)}</div>` : ''}
    <div class="msg-content">
      ${!isMe ? `
        <div class="sender-line">
          <span class="sender-name">${escHtml(senderLabel)}</span>
          ${isMgr ? '<span class="mgr-badge">管理人</span>' : ''}
        </div>
      ` : ''}
      <div class="bubble-wrap">
        ${isMe ? `
          <div class="meta-me">
            ${msg._sending ? '<span class="sending-lbl">送信中…</span>' : ''}
            ${msg._failed ? '<button class="failed-lbl" data-retry="${msg.message_id}">再送</button>' : ''}
            ${msg.is_read ? '<span class="read-lbl">既読</span>' : ''}
            <span class="msg-time">${escHtml(time)}</span>
          </div>
        ` : ''}
        <div class="bubble ${bubbleClass}">${msg.image_url
            ? `<img src="${escHtml(msg.image_url)}" class="chat-img" alt="送信画像" loading="lazy" onclick="window.open(this.src,'_blank')">`
            : escHtml(msg.body || '')}</div>
        ${!isMe ? `<span class="msg-time">${escHtml(time)}</span>` : ''}
      </div>
    </div>
  `;

    if (animate) row.style.animation = 'fadeIn .2s ease';
    msgList.appendChild(row);
}

function scrollBottom() {
    msgEnd.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// ─── 画像送信 ─────────────────────────────────────
async function handleImageSend(file) {
    if (!activeChatId || isSending) return;
    isSending = true;
    imageBtn.disabled = true;
    sendErr.classList.add('hidden');

    try {
        // 1. 画像アップロード
        const formData = new FormData();
        formData.append('image', file);
        const uploadRes = await fetch('api/upload_image.php', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.message || '画像のアップロードに失敗しました');

        // 2. メッセージ送信
        const chatId = activeChatId;
        const sendRes = await fetch('api/chat_send.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, image_url: uploadData.image_url }),
        });
        const sendData = await sendRes.json();
        if (!sendData.success || chatId !== activeChatId) return;

        appendMessage(sendData.message, false);
        if (sendData.message.message_id > lastMsgId) lastMsgId = sendData.message.message_id;
        scrollBottom();
        loadChatList();
    } catch (err) {
        showSendError(err.message || '画像の送信に失敗しました');
    } finally {
        isSending = false;
        imageBtn.disabled = false;
        sendBtn.disabled = msgInput.value.trim() === '';
    }
}

// ─── メッセージ送信 ────────────────────────────────
async function handleSend(e) {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text || isSending || !activeChatId) return;

    isSending = true;
    sendBtn.disabled = true;
    sendErr.classList.add('hidden');

    const tempId = `tmp_${Date.now()}`;
    const optimistic = {
        message_id: tempId,
        sender_user_id: currentUser?.user_id,
        sender_name: currentUser?.name || '管理人',
        sender_type: 'manager',
        body: text,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }),
        date: '',
        isMine: true,
        _sending: true,
    };

    appendMessage(optimistic, true);
    scrollBottom();
    msgInput.value = '';
    msgInput.style.height = 'auto';
    sendBtn.disabled = true;

    const chatId = activeChatId;

    try {
        const res = await apiFetch('chat_send.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, body: text }),
        });
        const data = await res.json();

        // 楽観的メッセージを削除
        document.querySelector(`[data-mid="${tempId}"]`)?.remove();

        if (data.success && chatId === activeChatId) {
            appendMessage(data.message, false);
            if (data.message.message_id > lastMsgId) lastMsgId = data.message.message_id;
            scrollBottom();
            loadChatList();
        } else {
            showSendError(data.message || '送信に失敗しました');
            // 楽観メッセージを失敗状態で戻す
            const failMsg = { ...optimistic, _sending: false, _failed: true };
            appendMessage(failMsg, false);
        }
    } catch {
        document.querySelector(`[data-mid="${tempId}"]`)?.remove();
        showSendError('送信エラーが発生しました');
    } finally {
        isSending = false;
        sendBtn.disabled = msgInput.value.trim() === '';
        msgInput.focus();
    }
}

function showSendError(msg) {
    sendErr.textContent = msg;
    sendErr.classList.remove('hidden');
    setTimeout(() => sendErr.classList.add('hidden'), 4000);
}

// ─── 接続バッジ ────────────────────────────────────
function setConnBadge(status) {
    connBadge.className = 'conn-badge';
    const map = {
        connecting: ['conn-connecting', '接続中…'],
        ok: ['conn-ok', 'リアルタイム'],
        polling: ['conn-polling', 'ポーリング中'],
        error: ['conn-error', '切断'],
    };
    const [cls, label] = map[status] || map.connecting;
    connBadge.classList.add(cls);
    connBadge.textContent = label;
}

// ─── ユーティリティ ────────────────────────────────
function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function apiFetch(path, options = {}) {
    return fetch(`${API}/${path}`, {
        credentials: 'include',
        ...options,
    });
}

// ─── フェードインアニメーション ────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleEl);
