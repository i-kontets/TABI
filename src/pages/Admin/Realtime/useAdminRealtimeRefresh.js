import { useEffect } from 'react';

export function useAdminRealtimeRefresh(events, reload) {
    useEffect(() => {
        const handleRealtimeEvent = (event) => {
            if (import.meta.env.DEV) {
                console.log('realtime event received:', event.type, event.detail);
            }
            reload();
        };

        events.forEach((eventName) => {
            window.addEventListener(eventName, handleRealtimeEvent);
        });

        return () => {
            events.forEach((eventName) => {
                window.removeEventListener(eventName, handleRealtimeEvent);
            });
        };
    }, [events, reload]);
}
