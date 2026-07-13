import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getUserSocket } from "./userSocket";

const USER_REALTIME_EVENTS = [
    "trip_updated",
    "trip_member_joined",
    "trip_member_left",
    "chat_message_created",
    "chat_message_updated",
    "chat_message_deleted",
    "talk_message_created",
    "candidate_created",
    "candidate_updated",
    "candidate_deleted",
    "poll_created",
    "poll_updated",
    "poll_deleted",
    "poll_vote_updated",
    "schedule_created",
    "schedule_updated",
    "schedule_deleted",
    "checklist_created",
    "checklist_updated",
    "checklist_deleted",
    "photo_uploaded",
    "photo_deleted",
    "album_updated",
    "packing_item_created",
    "packing_item_updated",
    "packing_item_deleted",
    "payment_updated",
    "notification_created",
    "user_updated",
];

function getGroupIdFromPath(pathname) {
    const match = pathname.match(/\/group\/(\d+)/);
    return match ? match[1] : null;
}

export default function UserRealtimeListener({ trip }) {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith("/admin");
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const groupId = getGroupIdFromPath(location.pathname) || queryParams.get("groupId") || queryParams.get("group_id") || trip?.id || null;

    useEffect(() => {
        if (isAdminRoute) return;

        const socket = getUserSocket();

        const handleConnect = async () => {
            if (import.meta.env.DEV) {
                console.log("WebSocket connected:", socket.id);
            }

            try {
                const response = await fetch(`${import.meta.env.BASE_URL}api/Auth/whoami.php`, {
                    credentials: "include",
                });
                const data = await response.json().catch(() => null);
                const userId = data?.user?.user_id;
                if (userId) {
                    socket.emit("join_user", userId);
                    if (import.meta.env.DEV) {
                        console.log("join_user sent:", userId);
                    }
                }
            } catch {
                // Not logged in, or whoami failed. Keep the socket available for trip rooms.
            }
        };

        const handlers = USER_REALTIME_EVENTS.map((eventName) => {
            const handler = (data) => {
                if (import.meta.env.DEV) {
                    console.log("realtime event received:", eventName, data);
                }
                window.dispatchEvent(new CustomEvent(`user:${eventName}`, { detail: data }));
            };
            socket.on(eventName, handler);
            return [eventName, handler];
        });

        socket.on("connect", handleConnect);

        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        return () => {
            socket.off("connect", handleConnect);
            handlers.forEach(([eventName, handler]) => {
                socket.off(eventName, handler);
            });
        };
    }, [isAdminRoute]);

    useEffect(() => {
        if (isAdminRoute) return;
        if (!groupId) return;

        const socket = getUserSocket();
        const joinTrip = () => {
            socket.emit("join_trip", groupId);
            if (import.meta.env.DEV) {
                console.log("join_trip sent:", groupId);
            }
        };

        if (socket.connected) {
            joinTrip();
        } else {
            socket.once("connect", joinTrip);
            socket.connect();
        }

        return () => {
            socket.off("connect", joinTrip);
        };
    }, [groupId, isAdminRoute]);

    return null;
}
