const statusEndpoint = `${import.meta.env.BASE_URL}api/system/status.php`;
export const maintenanceReturnPathKey = 'tabi_return_path';
export const maintenanceReasonKey = 'tabi_maintenance_reason';

function normalizeServiceStatus(data = {}, fallbackStatus = 'DATABASE_UNAVAILABLE') {
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
    const response = await fetch(statusEndpoint, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache',
        },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        return normalizeServiceStatus(data || {}, data?.status || data?.code || 'DATABASE_UNAVAILABLE');
    }

    return normalizeServiceStatus(data, 'AVAILABLE');
}

export function isMaintenanceCode(code) {
    return code === 'OUTSIDE_SERVICE_HOURS' ||
        code === 'SCHEDULED_DB_STOP' ||
        code === 'DATABASE_UNAVAILABLE';
}

export function saveMaintenanceReason(reason) {
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
    const status = await fetchServiceStatus();
    return Boolean(status.available);
}

export function isAdminPath(pathname = window.location.pathname) {
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
