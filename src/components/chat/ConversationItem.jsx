// src/components/chat/ConversationItem.jsx
import { memo } from "react";

function ConversationItem({ conversation, currentUserId, onClick, isActive }) {
    const otherUser =
        conversation.participant1?._id === currentUserId
            ? conversation.participant2
            : conversation.participant1;

    // Récupérer le dernier message
    const lastMsg = conversation.messages?.length > 0
        ? conversation.messages[conversation.messages.length - 1]
        : null;

    // Afficher le contenu du dernier message
    const getLastMsgContent = () => {
        if (!lastMsg) return "Aucun message";

        if (lastMsg.content) {
            return lastMsg.content;
        }

        if (lastMsg.media?.length > 0) {
            const mediaCount = lastMsg.media.length;
            if (lastMsg.media[0].mimetype?.startsWith("image/")) {
                return `📷 ${mediaCount > 1 ? `${mediaCount} photos` : "Photo"}`;
            }
            if (lastMsg.media[0].mimetype?.startsWith("video/")) {
                return `🎥 ${mediaCount > 1 ? `${mediaCount} vidéos` : "Vidéo"}`;
            }
            return `📎 ${mediaCount > 1 ? `${mediaCount} fichiers` : "Fichier"}`;
        }

        return "Message";
    };

    const lastMsgContent = getLastMsgContent();

    // Compter les messages non lus (envoyés par l'autre utilisateur et non lus)
    const unreadCount = conversation.messages?.filter(
        (msg) => msg.sender?._id !== currentUserId && !msg.read
    ).length || 0;

    const formatDate = (date) => {
        if (!date) return "";
        const msgDate = new Date(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (msgDate.toDateString() === today.toDateString()) {
            return msgDate.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        if (msgDate.toDateString() === yesterday.toDateString()) {
            return "Hier";
        }

        const diffDays = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return msgDate.toLocaleDateString("fr-FR", { weekday: "short" });
        }

        if (msgDate.getFullYear() === today.getFullYear()) {
            return msgDate.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short"
            });
        }

        return msgDate.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit"
        });
    };

    const lastMsgTime = lastMsg?.sentAt || conversation.updatedAt;

    const getInitials = () => {
        if (otherUser?.firstname) {
            const first = otherUser.firstname[0];
            const last = otherUser.lastname?.[0] || "";
            return (first + last).toUpperCase();
        }
        return (otherUser?.email?.[0] || "?").toUpperCase();
    };

    const getAvatarColor = () => {
        const colors = [
            "#007bff", "#28a745", "#dc3545", "#ffc107",
            "#17a2b8", "#6f42c1", "#fd7e14", "#20c997"
        ];
        const userId = otherUser?._id || otherUser?.id || "";
        const index = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    const isOnline = otherUser?.isOnline || false;

    return (
        <li
            onClick={onClick}
            style={{
                padding: "12px 15px",
                borderBottom: "1px solid #e0e0e0",
                cursor: "pointer",
                backgroundColor: isActive
                    ? "#e3f2fd"
                    : (unreadCount > 0 ? "#f0f8ff" : "white"),
                transition: "background-color 0.2s, transform 0.1s",
                position: "relative",
            }}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.backgroundColor = unreadCount > 0 ? "#e6f3ff" : "#f5f5f5";
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isActive
                    ? "#e3f2fd"
                    : (unreadCount > 0 ? "#f0f8ff" : "white");
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                    style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        backgroundColor: getAvatarColor(),
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: "bold",
                        flexShrink: 0,
                        position: "relative",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                >
                    {otherUser?.avatar ? (
                        <img
                            src={otherUser.avatar}
                            alt={otherUser.firstname || otherUser.email}
                            style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                objectFit: "cover",
                            }}
                        />
                    ) : (
                        getInitials()
                    )}

                    {isOnline && (
                        <div
                            style={{
                                position: "absolute",
                                bottom: "2px",
                                right: "2px",
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: "#28a745",
                                border: "2px solid white",
                            }}
                            title="En ligne"
                        />
                    )}
                </div>

                <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px"
                    }}>
                        <h4 style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: unreadCount > 0 ? "700" : "600",
                            color: "#333",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                        }}>
                            {otherUser?.firstname || otherUser?.email || "Utilisateur"}
                        </h4>

                        <small style={{
                            color: "#999",
                            fontSize: "12px",
                            marginLeft: "8px",
                            flexShrink: 0,
                        }}>
                            {formatDate(lastMsgTime)}
                        </small>
                    </div>

                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <small
                            style={{
                                color: unreadCount > 0 ? "#333" : "#666",
                                fontWeight: unreadCount > 0 ? "600" : "normal",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                                fontSize: "14px",
                                lineHeight: "1.3",
                            }}
                        >
                            {lastMsg?.sender?._id === currentUserId && (
                                <span style={{ marginRight: "4px" }}>
                                    {lastMsg?.read ? "✓✓" : "✓"}
                                </span>
                            )}
                            {lastMsg?.sender?._id === currentUserId && "Vous: "}
                            {lastMsgContent}
                        </small>

                        {unreadCount > 0 && (
                            <span
                                style={{
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    borderRadius: "12px",
                                    padding: "3px 8px",
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    minWidth: "20px",
                                    textAlign: "center",
                                    flexShrink: 0,
                                    boxShadow: "0 1px 3px rgba(0,123,255,0.3)",
                                }}
                            >
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}

export default memo(ConversationItem, (prevProps, nextProps) => {
    return (
        prevProps.conversation._id === nextProps.conversation._id &&
        prevProps.conversation.updatedAt === nextProps.conversation.updatedAt &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.conversation.messages?.length === nextProps.conversation.messages?.length
    );
});