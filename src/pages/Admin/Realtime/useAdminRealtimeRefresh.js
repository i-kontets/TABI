import { useEffect } from 'react';

/**
 * 管理者画面でリアルタイム通知を受けたときに、指定された再読み込み処理を実行するフックです。
 *
 * events には監視したい admin:xxx のイベント名を渡します。
 * reload には、その画面の一覧や集計を取り直す関数を渡します。
 */
export function useAdminRealtimeRefresh(events, reload) {
    useEffect(() => {
        const handleRealtimeEvent = (event) => {
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
        const shouldListenForSystemError = events.includes('admin:system_error_created');
        const handleBroadcastMessage = (event) => {
            if (!shouldListenForSystemError) {
                return;
            }

            handleRealtimeEvent({
                type: 'admin:system_error_created',
                detail: event.data || {},
            });
        };
        const handleStorageEvent = (event) => {
            if (!shouldListenForSystemError || event.key !== 'tabi:last-system-error-event') {
                return;
            }

            handleRealtimeEvent({
                type: 'admin:system_error_created',
                detail: event.newValue || {},
            });
        };

        if (shouldListenForSystemError) {
            try {
                channel = new BroadcastChannel('tabi-admin-system-errors');
                channel.addEventListener('message', handleBroadcastMessage);
            } catch {
                window.addEventListener('storage', handleStorageEvent);
            }
        }

        return () => {
            // コンポーネントが消えるときに解除し、同じ画面へ戻ったときの二重登録を防ぎます。
            events.forEach((eventName) => {
                window.removeEventListener(eventName, handleRealtimeEvent);
            });

            if (channel) {
                channel.removeEventListener('message', handleBroadcastMessage);
                channel.close();
            } else {
                window.removeEventListener('storage', handleStorageEvent);
            }
        };
    }, [events, reload]);
}
