/**
 * 管理画面でリアルタイム通知を受け取り、必要な画面更新につなげます。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理 API から取得した一覧や詳細データ、画面上の検索条件や入力値を主に扱います。
 */
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
    "system_error_resolved",
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

/**
 * AdminRealtimeListener は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function AdminRealtimeListener() {
    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // getAdminSocket は管理者画面で共有する socket.io クライアントを返します。
        const socket = getAdminSocket();

        // handleConnect は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleConnect = () => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (import.meta.env.DEV) {
                console.log("WebSocket connected:", socket.id);
            }
            // join_admin を送ることで、サーバー側の管理者向け通知ルームに参加します。
            // join_adminで管理者用の部屋へ参加し、問い合わせ・通報・ユーザー更新などの通知を受け取ります。
            socket.emit("join_admin");
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (import.meta.env.DEV) {
                console.log("join_admin sent");
            }
        };

        // handleDisconnect は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleDisconnect = () => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (import.meta.env.DEV) {
                console.log("WebSocket disconnected");
            }
        };

        // 配列のデータを1件ずつ画面表示用の形に変換します。
        const handlers = ADMIN_REALTIME_EVENTS.map((eventName) => {
            // handler は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
            const handler = (data) => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
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
