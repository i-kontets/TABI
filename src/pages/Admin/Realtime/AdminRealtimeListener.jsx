import { useEffect } from "react";
import { getAdminSocket } from "./AdminSocket";

const ADMIN_REALTIME_EVENTS = [
    "user_created",
    "user_updated",
    "user_deleted",
    "group_created",
    "group_updated",
    "group_deleted",
    "post_created",
    "post_updated",
    "post_deleted",
    "report_created",
    "report_updated",
    "inquiry_created",
    "inquiry_updated",
    "notice_created",
    "notice_updated",
    "notice_deleted",
    "spot_created",
    "spot_updated",
    "spot_deleted",
    "manager_created",
    "manager_updated",
    "manager_deleted",
];

export default function AdminRealtimeListener() {
    useEffect(() => {
        const socket = getAdminSocket();

        const handleConnect = () => {
            if (import.meta.env.DEV) {
                console.log("WebSocket connected:", socket.id);
            }
            socket.emit("join_admin");
            if (import.meta.env.DEV) {
                console.log("join_admin sent");
            }
        };

        const handleDisconnect = () => {
            if (import.meta.env.DEV) {
                console.log("WebSocket disconnected");
            }
        };

        const handlers = ADMIN_REALTIME_EVENTS.map((eventName) => {
            const handler = (data) => {
                if (import.meta.env.DEV) {
                    console.log("realtime event received:", eventName, data);
                }
                window.dispatchEvent(
                    new CustomEvent(`admin:${eventName}`, {
                        detail: data,
                    })
                );
            };
            socket.on(eventName, handler);
            return [eventName, handler];
        });

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            handlers.forEach(([eventName, handler]) => {
                socket.off(eventName, handler);
            });
        };
    }, []);

    return null;
}
