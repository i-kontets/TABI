const AUTH_RETURN_PATH_KEY = "tabi:auth-return-path";

export function isSafeAppPath(path) {
    return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

export function getReturnPathFromSearchParams(searchParams) {
    const returnTo = searchParams.get("returnTo");
    return isSafeAppPath(returnTo) ? returnTo : "";
}

export function saveAuthReturnPath(path) {
    if (isSafeAppPath(path)) {
        sessionStorage.setItem(AUTH_RETURN_PATH_KEY, path);
    }
}

export function consumeAuthReturnPath(fallbackPath = "/Home") {
    const savedPath = sessionStorage.getItem(AUTH_RETURN_PATH_KEY);
    sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);
    return isSafeAppPath(savedPath) ? savedPath : fallbackPath;
}

export function resolveAuthReturnPath(returnPath, fallbackPath = "/Home") {
    const savedPath = consumeAuthReturnPath(fallbackPath);
    return isSafeAppPath(returnPath) ? returnPath : savedPath;
}

export function buildAuthPath(path, returnTo) {
    if (!isSafeAppPath(returnTo)) {
        return path;
    }

    return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
