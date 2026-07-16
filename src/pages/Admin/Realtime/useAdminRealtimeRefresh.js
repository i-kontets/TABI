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
import { useEffect } from 'react';

/**
 * 管理者画面でリアルタイム通知を受けたときに、指定された再読み込み処理を実行するフックです。
 *
 * events には監視したい admin:xxx のイベント名を渡します。
 * reload には、その画面の一覧や集計を取り直す関数を渡します。
 */
export function useAdminRealtimeRefresh(events, reload) {
    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // handleRealtimeEvent は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleRealtimeEvent = (event) => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (import.meta.env.DEV) {
                console.log('realtime event received:', event.type, event.detail);
            }
            // 通知の中身を画面で直接書き換えるのではなく、APIから最新データを取り直します。
            // これにより、複数項目が同時に変わった場合も画面全体の整合性を保ちやすくなります。
            reload();
        };

        // 指定されたイベントをすべて監視対象にします。
        events.forEach((eventName) => {
            window.addEventListener(eventName, handleRealtimeEvent);
        });

        let channel = null;
        const shouldListenForSystemError = events.includes('admin:system_error_created') || events.includes('admin:system_error_resolved');
        // handleBroadcastMessage は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleBroadcastMessage = (event) => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!shouldListenForSystemError) {
                return;
            }

            const type = event.data?.type || event.data?.event || 'system_error_created';
            handleRealtimeEvent({
                type: `admin:${type}`,
                detail: event.data || {},
            });
        };
        // handleStorageEvent は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
        const handleStorageEvent = (event) => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!shouldListenForSystemError || event.key !== 'tabi:last-system-error-event') {
                return;
            }

            let data = {};
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                data = JSON.parse(event.newValue || "{}");
            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            } catch {
                data = {};
            }
            const type = data?.type || data?.event || 'system_error_created';
            handleRealtimeEvent({
                type: `admin:${type}`,
                detail: data,
            });
        };

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (shouldListenForSystemError) {
            // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
            try {
                channel = new BroadcastChannel('tabi-admin-system-errors');
                channel.addEventListener('message', handleBroadcastMessage);
            // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
            } catch {
                window.addEventListener('storage', handleStorageEvent);
            }
        }

        return () => {
            // コンポーネントが消えるときに解除し、同じ画面へ戻ったときの二重登録を防ぎます。
            events.forEach((eventName) => {
                window.removeEventListener(eventName, handleRealtimeEvent);
            });

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (channel) {
                channel.removeEventListener('message', handleBroadcastMessage);
                channel.close();
            } else {
                window.removeEventListener('storage', handleStorageEvent);
            }
        };
    }, [events, reload]);
}
