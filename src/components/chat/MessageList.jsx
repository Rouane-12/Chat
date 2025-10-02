import { useEffect, useRef, memo } from "react";

const MessageItem = memo(({ message, isOwn }) => {
    const senderName = message.sender?.firstname
        ? `${message.sender.firstname} ${message.sender.lastname || ""}`.trim()
        : message.sender?.email || "Utilisateur";

    const formatTime = (date) => {
        if (!date) return "";
        return new Date(date).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: isOwn ? "flex-end" : "flex-start",
                marginBottom: "15px",
            }}
        >
            <div
                style={{
                    maxWidth: "70%",
                    padding: "10px 15px",
                    borderRadius: "12px",
                    backgroundColor: isOwn ? "#007bff" : "#f1f1f1",
                    color: isOwn ? "white" : "black",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
            >
                {/* Nom de l'expéditeur (seulement si ce n'est pas nous) */}
                {!isOwn && (
                    <div
                        style={{
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                            marginBottom: "5px",
                            opacity: 0.8,
                        }}
                    >
                        {senderName}
                    </div>
                )}

                {/* Contenu texte */}
                {message.content && (
                    <div
                        style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            lineHeight: "1.4",
                        }}
                    >
                        {message.content}
                    </div>
                )}

                {/* Médias */}
                {message.media?.length > 0 && (
                    <div
                        style={{
                            marginTop: message.content ? "8px" : "0",
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                        }}
                    >
                        {message.media.map((file) => {
                            const isImage = file.mimetype?.startsWith("image/");
                            const isVideo = file.mimetype?.startsWith("video/");

                            if (isImage) {
                                return (
                                    <a
                                        key={file._id}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <img
                                            src={file.url}
                                            alt={file.filename}
                                            style={{
                                                maxWidth: "200px",
                                                maxHeight: "200px",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                objectFit: "cover",
                                            }}
                                            loading="lazy"
                                        />
                                    </a>
                                );
                            }

                            if (isVideo) {
                                return (
                                    <video
                                        key={file._id}
                                        src={file.url}
                                        controls
                                        style={{
                                            maxWidth: "300px",
                                            borderRadius: "8px",
                                        }}
                                    />
                                );
                            }

                            return (
                                <a
                                    key={file._id}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "8px 12px",
                                        backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.05)",
                                        borderRadius: "6px",
                                        textDecoration: "none",
                                        color: isOwn ? "white" : "inherit",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    📎 {file.filename || "Fichier"}
                                </a>
                            );
                        })}
                    </div>
                )}

                <div
                    style={{
                        fontSize: "0.75rem",
                        marginTop: "5px",
                        opacity: 0.7,
                        textAlign: "right",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "5px",
                    }}
                >
                    {formatTime(message.sentAt || message.createdAt)}
                    {isOwn && (
                        <span title={message.read ? "Lu" : "Envoyé"}>
                            {message.read ? "✓✓" : "✓"}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

MessageItem.displayName = "MessageItem";

function MessageList({ messages }) {
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserId = user?._id || user?.id;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

            container.dataset.autoScroll = isAtBottom ? "true" : "false";
        };

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    if (!messages || messages.length === 0) {
        return (
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#888",
                    fontSize: "1rem",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "10px" }}>💬</div>
                    <p>Aucun message pour le moment.</p>
                    <p style={{ fontSize: "0.9rem", marginTop: "5px" }}>
                        Commencez la conversation !
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                backgroundColor: "#fafafa",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
            }}
        >
            {messages.map((msg, index) => {
                const currentDate = new Date(msg.sentAt || msg.createdAt).toLocaleDateString("fr-FR");
                const prevDate = index > 0
                    ? new Date(messages[index - 1].sentAt || messages[index - 1].createdAt).toLocaleDateString("fr-FR")
                    : null;

                const showDateSeparator = currentDate !== prevDate;

                return (
                    <div key={msg._id || msg.id || index}>
                        {showDateSeparator && (
                            <div
                                style={{
                                    textAlign: "center",
                                    margin: "20px 0 10px",
                                    fontSize: "0.85rem",
                                    color: "#666",
                                }}
                            >
                                <span
                                    style={{
                                        backgroundColor: "#e0e0e0",
                                        padding: "4px 12px",
                                        borderRadius: "12px",
                                        display: "inline-block",
                                    }}
                                >
                                    {currentDate}
                                </span>
                            </div>
                        )}

                        <MessageItem
                            message={msg}
                            isOwn={msg.sender?._id === currentUserId || msg.sender?.id === currentUserId}
                        />
                    </div>
                );
            })}

            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessageList;