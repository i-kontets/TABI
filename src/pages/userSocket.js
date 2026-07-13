import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://ws.tabital.com";

let socket = null;

export function getUserSocket() {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket"],
            autoConnect: false,
        });
    }

    return socket;
}
