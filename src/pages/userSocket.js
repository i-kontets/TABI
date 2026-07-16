/**
 * JavaScript の共通処理として、画面や API 呼び出しを支える処理を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import { io } from "socket.io-client";

// 接続先URLです。ローカル検証では環境変数、本番では公開済みWebSocketサーバーを使う想定です。
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://ws.tabital.com";

let socket = null;

export function getUserSocket() {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!socket) {
        // transportsをwebsocketに固定し、ポーリングではなくリアルタイム通信用の接続を優先します。
        socket = io(SOCKET_URL, {
            transports: ["websocket"],
            autoConnect: false,
        });
    }

    return socket;
}
