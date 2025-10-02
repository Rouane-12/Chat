import { useConversations } from "../../hooks/useChat";
import ConversationItem from "./ConversationItem";

function ConversationList({ onSelect }) {
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?._id || user?.id;

    const { conversations, loading } = useConversations(userId);

    if (loading) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <p>Chargement...</p>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <p>Aucune conversation</p>
            </div>
        );
    }

    return (
        <ul className="conversation-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {conversations.map((conv) => (
                <ConversationItem
                    key={conv._id}
                    conversation={conv}
                    currentUserId={userId}
                    onClick={() => onSelect(conv._id)}
                />
            ))}
        </ul>
    );
}

export default ConversationList;