import { useMessages } from "../../hooks/useChat";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

function ChatWindow({ conversationId }) {
    const { messages, loading, addMessage } = useMessages(conversationId);

    if (loading) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p>Chargement des messages...</p>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <h1>💬 Chat</h1>
            <MessageList messages={messages} />
            <MessageInput
                conversationId={conversationId}
                onSend={addMessage}
            />
        </div>
    );
}

export default ChatWindow;