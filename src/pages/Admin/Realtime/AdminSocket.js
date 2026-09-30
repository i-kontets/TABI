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
import { createAuthenticatedSocket } from '../../../api/authenticatedSocket';

let socket = null;

export function getAdminSocket() {
  // ここで条件を確認し、状況に合う処理だけを実行します。
  if (!socket) {
    // transportsをwebsocketに固定し、ポーリングではなくリアルタイム通信用の接続を優先します。
    socket = createAuthenticatedSocket();
  }

  return socket;
}
