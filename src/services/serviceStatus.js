const statusEndpoint = `${import.meta.env.BASE_URL}api/system/status.php`;
const dbProbeEndpoint = `${import.meta.env.BASE_URL}api/Auth/whoami.php`;
export const maintenanceReturnPathKey = 'tabi_return_path';
export const maintenanceReasonKey = 'tabi_maintenance_reason';

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
        return {
            available: false,
            reason: data?.code || 'DATABASE_UNAVAILABLE',
            now: data?.now || null,
            nextOpenAt: data?.nextOpenAt || null,
            nextCloseAt: null,
            timezone: data?.timezone || 'Asia/Tokyo',
        };
    }

    return data;
}

export function isMaintenanceCode(code) {
    return code === 'OUTSIDE_SERVICE_HOURS' || code === 'DATABASE_UNAVAILABLE';
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
    const response = await fetch(dbProbeEndpoint, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache',
        },
    });
    const data = await response.clone().json().catch(() => null);

    return !(response.status === 503 && data?.code === 'DATABASE_UNAVAILABLE');
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
