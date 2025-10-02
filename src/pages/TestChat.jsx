import { useState } from "react";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import withAuth from "../hocs/withAuth";

function ChatPage() {
    const [activeConversation, setActiveConversation] = useState(null);

    return (
        <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ width: "25%" }}>
                <h2>Liste des discussions</h2>
                <ConversationList onSelect={setActiveConversation} />
            </div>
            {activeConversation ? (
                <ChatWindow conversationId={activeConversation} />
            ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p>Sélectionne une conversation</p>
                </div>
            )}
        </div>
    );
}

export default withAuth(ChatPage);