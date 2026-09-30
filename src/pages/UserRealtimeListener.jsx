/**
 * React の画面または部品として、表示内容とユーザー操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getUserSocket } from "./userSocket";

// ここに並ぶイベント名を受け取った時だけ、利用者画面へ更新通知を流します。
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

/**
 * getGroupIdFromPath は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function getGroupIdFromPath(pathname) {
    const match = pathname.match(/\/group\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * UserRealtimeListener は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function UserRealtimeListener({ trip }) {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith("/admin");
    // ログイン画面へ戻ると接続を閉じ、前の利用者の部屋を持ち越しません。
    const isPublicRoute = ['/', '/Newreg'].includes(location.pathname);
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const groupId = getGroupIdFromPath(location.pathname) || queryParams.get("groupId") || queryParams.get("group_id") || trip?.id || null;

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (isAdminRoute || isPublicRoute) {
            getUserSocket().disconnect();
            return;
        }

        const socket = getUserSocket();
        // 本人roomは認証後にAWS側で自動参加します。受信できなかった履歴はAPIで回復します。
        const handleConnect = () => {
            // 新フロントを先に配備する短い期間だけ旧サーバーも動かせる互換イベントです。
            // IDはSession確認済みAPIから取得し、新サーバーでは署名済み本人IDとの一致が必須です。
            if (socket.authenticatedUserId) socket.emit('join_user', socket.authenticatedUserId);
            window.dispatchEvent(new Event('user:reconnected'));
        };

        // 配列のデータを1件ずつ画面表示用の形に変換します。
        const handlers = USER_REALTIME_EVENTS.map((eventName) => {
            // handler は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
            const handler = (data) => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (import.meta.env.DEV) {
                    console.log("realtime event received:", eventName, data);
                }
                window.dispatchEvent(new CustomEvent(`user:${eventName}`, { detail: data }));
            };
            socket.on(eventName, handler);
            return [eventName, handler];
        });

        socket.on("connect", handleConnect);
        // 別タブでログイン・ログアウトした場合も、前の利用者の部屋を破棄します。
        const handleAccountChange = (event) => {
            if (event.key !== 'loginUser') return;
            socket.disconnect();
            if (event.newValue) socket.connect();
        };
        window.addEventListener('storage', handleAccountChange);

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        return () => {
            window.removeEventListener('storage', handleAccountChange);
            // クリーンアップで接続イベントと各通知イベントを外し、画面遷移後の二重受信を防ぎます。
            socket.off("connect", handleConnect);
            handlers.forEach(([eventName, handler]) => {
                socket.off(eventName, handler);
            });
            socket.disconnect();
        };
    }, [isAdminRoute, isPublicRoute]);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (isAdminRoute || isPublicRoute) return;
        // ここで条件を確認し、状況に合う処理だけを実行します。
        const socket = getUserSocket();
        // groupIdは既存trip roomで使うグループIDです。署名前にPHPが所属を検証します。
        socket.setRequestedRooms(groupId ? [`trip:${groupId}`] : []);
        if (!groupId) return;
        // joinTrip は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const joinTrip = () => {
            // join_tripで現在の旅行グループの部屋へ参加し、同じグループ内の変更通知を受け取ります。
            socket.emit("join_trip", groupId);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (import.meta.env.DEV) {
                console.log("join_trip sent:", groupId);
            }
        };

        // ここで条件を確認し、状況に合う処理だけを実行します。
        socket.on("connect", joinTrip);
        if (socket.connected) {
            joinTrip();
        } else {
            socket.connect();
        }

        return () => {
            socket.off("connect", joinTrip);
            socket.emit("leave_trip", groupId);
        };
    }, [groupId, isAdminRoute, isPublicRoute]);

    return null;
}
