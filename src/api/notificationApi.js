/**
 * 通知関連のPHP API(api/Notifications/)をフロントエンドから呼び出すための関数集です。
 *
 * 主な流れ:
 * 1. 各APIのURLを notificationApi にまとめて定義する
 * 2. fetch でAPIを呼び出し、共通のエラーチェック(parseNotificationResponse)を通す
 * 3. 画面側(通知一覧・ベルアイコンなど)へ結果のJSONを返す
 *
 * 扱うデータ: 通知一覧・未読件数・既読状態・通知設定・FCM端末トークン。
 */

// 通知系APIのエンドポイントURL一覧です。1か所にまとめて変更しやすくしています。
const notificationApi = {
	device: '/TABI/api/Notifications/RegisterDevice.php',      // プッシュ通知端末の登録
	settings: '/TABI/api/Notifications/Settings.php',          // 通知設定の取得・保存
	list: '/TABI/api/Notifications/List.php',                  // 通知一覧の取得
	unreadCount: '/TABI/api/Notifications/UnreadCount.php',    // 未読件数の取得
	markRead: '/TABI/api/Notifications/MarkRead.php',          // 1件既読
	markAllRead: '/TABI/api/Notifications/MarkAllRead.php',    // 全件既読
};

/**
 * APIレスポンスをJSONとして解析し、失敗時はエラーを投げる共通処理です。
 * すべての通知APIがこの関数を通ることで、エラー処理を統一しています。
 */
async function parseNotificationResponse(response) {
	// JSONの解析に失敗しても落ちないよう、失敗時は空オブジェクトにします。
	const data = await response.json().catch(() => ({}));

	// HTTPエラー、またはAPIが success: false を返した場合はエラーとして扱います。
	if (!response.ok || data.success === false) {
		// APIのメッセージがあればそれを、なければ既定の文言を使います。
		const error = new Error(data.message || '通知APIの通信に失敗しました。');
		// 呼び出し側がステータスコードや詳細を参照できるように付加します。
		error.status = response.status;
		error.data = data;
		throw error;
	}

	return data;
}

/**
 * パラメータのオブジェクトからURLクエリ文字列("?key=value&...")を組み立てます。
 * undefined / null / 空文字 の項目は自動的に除外します。
 */
function createNotificationQuery(params) {
	const query = new URLSearchParams();

	// 値が存在する項目だけをクエリに追加します。
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			query.set(key, String(value));
		}
	});

	const queryString = query.toString();
	// パラメータが1つも無ければ空文字を返します(URLに "?" だけ付くのを防ぐ)。
	return queryString ? '?' + queryString : '';
}

/**
 * プッシュ通知を受け取る端末(FCMトークン)をサーバーへ登録します。
 */
async function registerNotificationDevice({ token, platform = 'web', appType = 'pwa', deviceName = null, browser = null }) {
	// FCM token is only sent to the device registration API. Never print it to the UI or logs.
	// FCMトークンは端末登録APIにだけ送り、画面やログには絶対に出しません(秘密情報のため)。
	const response = await fetch(notificationApi.device, {
		method: 'POST',
		credentials: 'include', // セッションCookieを一緒に送り、ログイン状態を伝えます。
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, platform, appType, deviceName, browser }),
	});

	return parseNotificationResponse(response);
}

/**
 * 現在の通知設定(チャット通知ON/OFFなど)をサーバーから取得します。
 */
async function fetchNotificationSettings() {
	const response = await fetch(notificationApi.settings, {
		method: 'GET',
		credentials: 'include', // セッションCookieを一緒に送ります。
	});

	return parseNotificationResponse(response);
}

/**
 * 通知設定を保存します。変更したい項目だけを渡せます(部分更新)。
 */
async function updateNotificationSettings(settings) {
	const response = await fetch(notificationApi.settings, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(settings),
	});

	return parseNotificationResponse(response);
}

/**
 * 通知一覧を取得します。カテゴリ絞り込みとページング(limit/offset)に対応しています。
 * signal は画面遷移時などにリクエストを中断するための AbortSignal です。
 */
async function fetchNotifications({ category = 'all', limit = 20, offset = 0, recipientId, signal } = {}) {
	// 通知一覧はDB上の履歴を正として表示するため、モックではなくPHP APIから取得します。
	// 詳細を再読み込みするときも、同じ本人限定APIを利用します。
	const query = createNotificationQuery({ category, limit, offset, recipientId });
	const response = await fetch(notificationApi.list + query, {
		method: 'GET',
		credentials: 'include',
		signal, // AbortController から渡されると、途中でキャンセルできます。
	});

	return parseNotificationResponse(response);
}

/**
 * 未読通知の件数を取得します(ベルアイコンのバッジ表示用)。
 */
async function fetchUnreadNotificationCount({ signal } = {}) {
	// ベルの数字と一覧画面の件数を同じAPIから取ることで、表示のずれを減らします。
	const response = await fetch(notificationApi.unreadCount, {
		method: 'GET',
		credentials: 'include',
		signal,
	});

	return parseNotificationResponse(response);
}

/**
 * 指定した1件の通知を既読にします。
 */
async function markNotificationAsRead(recipientId) {
	// 既読APIはnotification_idではなく、ユーザー宛レコードのrecipientIdを指定します。
	const query = createNotificationQuery({ recipientId });
	const response = await fetch(notificationApi.markRead + query, {
		method: 'PATCH',
		credentials: 'include',
	});

	return parseNotificationResponse(response);
}

/**
 * すべての未読通知をまとめて既読にします。
 */
async function markAllNotificationsAsRead() {
	// 一括既読はログインユーザーの未読通知をサーバー側でまとめて更新します。
	const response = await fetch(notificationApi.markAllRead, {
		method: 'PATCH',
		credentials: 'include',
	});

	return parseNotificationResponse(response);
}

// 画面側から使う関数をまとめてエクスポートします。
export {
	fetchNotificationSettings,
	fetchNotifications,
	fetchUnreadNotificationCount,
	markAllNotificationsAsRead,
	markNotificationAsRead,
	registerNotificationDevice,
	updateNotificationSettings,
};
