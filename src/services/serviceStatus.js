/**
 * サービス全体の稼働状態を確認するための共通処理です。
 *
 * ユーザー画面と管理者画面の両方から使われます。
 * APIの返却形式が少し変わっても画面側の呼び出し方を変えなくてよいように、
 * normalizeServiceStatus で同じ形へ整えています。
 */
const statusEndpoint = `${import.meta.env.BASE_URL}api/system/status.php`;
export const maintenanceReturnPathKey = 'tabi_return_path';
export const maintenanceReasonKey = 'tabi_maintenance_reason';

function normalizeServiceStatus(data = {}, fallbackStatus = 'DATABASE_UNAVAILABLE') {
    // status/code/reason のどれで返ってきても、画面側では reason と status の両方で読めるようにします。
    const statusCode = data.status || data.code || data.reason || fallbackStatus;
    const available = Boolean(data.databaseAvailable ?? data.available ?? data.serviceAvailable);
    const checkedAt = data.checkedAt || data.now || null;
    const nextScheduledOpenAt = data.nextScheduledOpenAt ?? data.nextOpenAt ?? null;
    const nextScheduledCloseAt = data.nextScheduledCloseAt ?? data.nextCloseAt ?? null;

    return {
        ...data,
        available,
        databaseAvailable: available,
        serviceAvailable: available,
        status: statusCode,
        reason: statusCode,
        scheduledToRun: Boolean(data.scheduledToRun ?? data.databaseScheduled),
        checkedAt,
        now: checkedAt,
        nextScheduledOpenAt,
        nextScheduledCloseAt,
        nextOpenAt: nextScheduledOpenAt,
        nextCloseAt: nextScheduledCloseAt,
        timezone: data.timezone || 'Asia/Tokyo',
    };
}

export async function fetchServiceStatus() {
    // cache: no-store を指定し、DB復旧後も古い停止状態をブラウザキャッシュから読まないようにします。
    const response = await fetch(statusEndpoint, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache',
        },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        // status.php 自体が失敗した場合も、画面側ではDB利用不可として扱える形に整えます。
        return normalizeServiceStatus(data || {}, data?.status || data?.code || 'DATABASE_UNAVAILABLE');
    }

    return normalizeServiceStatus(data, 'AVAILABLE');
}

export function isMaintenanceCode(code) {
    // これらのコードは、通常画面ではなく専用の案内画面へ切り替える対象です。
    return code === 'OUTSIDE_SERVICE_HOURS' ||
        code === 'SCHEDULED_DB_STOP' ||
        code === 'DATABASE_UNAVAILABLE';
}

export function saveMaintenanceReason(reason) {
    // メンテナンス画面へ遷移した後も理由を参照できるよう、セッションストレージへ一時保存します。
    if (isMaintenanceCode(reason)) {
        sessionStorage.setItem(maintenanceReasonKey, reason);
    }
}

export function getMaintenanceReason() {
    return sessionStorage.getItem(maintenanceReasonKey);
}

export function clearMaintenanceReason() {
    sessionStorage.removeItem(maintenanceReasonKey);
}

export async function probeDatabaseAvailability() {
    // DBが復旧したか確認するときも、個別APIではなく状態確認APIを使って判定を1か所に集約します。
    const status = await fetchServiceStatus();
    return Boolean(status.available);
}

export function isAdminPath(pathname = window.location.pathname) {
    // ViteのBASE_URLが付いたURLでも判定できるよう、先にベースパスを取り除きます。
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const path = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
    return path.toLowerCase().startsWith('/admin');
}

export function isMaintenancePath(pathname = window.location.pathname) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const path = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
    return path.toLowerCase().startsWith('/maintenance');
}

export function saveReturnPath(pathname = window.location.pathname, search = window.location.search) {
    // メンテナンス終了後に元の画面へ戻れるよう、現在の画面パスを保存します。
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const path = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;

    if (
        path.toLowerCase().startsWith('/maintenance') ||
        path.toLowerCase().startsWith('/admin') ||
        path.toLowerCase().includes('/api/') ||
        path.toLowerCase().includes('/logout')
    ) {
        return;
    }

    sessionStorage.setItem(maintenanceReturnPathKey, `${path}${search || ''}`);
}

export function getReturnPath() {
    const saved = sessionStorage.getItem(maintenanceReturnPathKey);

    if (saved && saved.startsWith('/') && !saved.startsWith('//') && !saved.toLowerCase().startsWith('/admin')) {
        return saved;
    }

    return '/Home';
}

export function clearReturnPath() {
    sessionStorage.removeItem(maintenanceReturnPathKey);
}
