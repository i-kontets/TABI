import { useEffect } from "react";
import { getAdminSocket } from "./AdminSocket";

/**
 * 管理者画面全体でWebSocket通知を受け取るためのコンポーネントです。
 *
 * サーバーから「ユーザーが作成された」「通報が更新された」などの通知を受け取り、
 * window のカスタムイベントへ変換します。
 * 各画面はそのカスタムイベントを監視して、必要なデータだけを再取得します。
 */
const ADMIN_REALTIME_EVENTS = [
    "user_created",
    "user_updated",
    "user_deleted",
    "user_active_updated",
    "system_error_created",
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
        // getAdminSocket は管理者画面で共有する socket.io クライアントを返します。
        const socket = getAdminSocket();

        const handleConnect = () => {
            if (import.meta.env.DEV) {
                console.log("WebSocket connected:", socket.id);
            }
            // join_admin を送ることで、サーバー側の管理者向け通知ルームに参加します。
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
                // socket.io のイベント名を admin:xxx のブラウザ標準イベントに変換します。
                // これにより、画面コンポーネントはsocket.ioを直接知らなくても更新通知を受け取れます。
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

        // すでに接続済みならすぐ参加処理を行い、未接続ならここで接続を開始します。
        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        return () => {
            // 画面から外れるときはイベント購読を解除し、同じ通知が重複して処理されないようにします。
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            handlers.forEach(([eventName, handler]) => {
                socket.off(eventName, handler);
            });
        };
    }, []);

    return null;
}
