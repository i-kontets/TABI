import { useEffect } from "react";
import { getAdminSocket } from "./AdminSocket";

export default function AdminRealtimeListener() {
    useEffect(() => {
        const socket = getAdminSocket();

        const handleConnect = () => {
            if (import.meta.env.DEV) {
                console.log("WebSocket connected:", socket.id);
            }

            socket.emit("join_admin");
        };

        const handleDisconnect = () => {
            if (import.meta.env.DEV) {
                console.log("WebSocket disconnected");
            }
        };

        const handleInquiryCreated = (data) => {
            if (import.meta.env.DEV) {
                console.log("Realtime inquiry_created received", data);
            }

            window.dispatchEvent(
                new CustomEvent("admin:inquiry_created", {
                    detail: data,
                })
            );
        };

        const handleReportCreated = (data) => {
            if (import.meta.env.DEV) {
                console.log("Realtime report_created received", data);
            }

            window.dispatchEvent(
                new CustomEvent("admin:report_created", {
                    detail: data,
                })
            );
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("inquiry_created", handleInquiryCreated);
        socket.on("report_created", handleReportCreated);

        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("inquiry_created", handleInquiryCreated);
            socket.off("report_created", handleReportCreated);
        };
    }, []);

    return null;
}
