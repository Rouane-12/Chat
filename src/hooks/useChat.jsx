import { useEffect, useRef, useCallback, useState } from 'react';
import * as Ably from 'ably';
import axios from 'axios';

export function useAblyConnection() {
    const ablyRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const initConnection = async () => {
            try {
                ablyRef.current = new Ably.Realtime({
                    authUrl: 'https://beautyswap-back.vercel.app/api/auth/ably-token',
                    authHeaders: {
                        Authorization: `Bearer ${token}`,
                    },
                    disconnectedRetryTimeout: 5000,
                    suspendedRetryTimeout: 10000,
                });

                ablyRef.current.connection.on('connected', () => {
                    console.log('✅ Ably connecté');
                    setIsConnected(true);
                    setError(null);
                });

                ablyRef.current.connection.on('disconnected', () => {
                    console.warn('⚠️ Ably déconnecté');
                    setIsConnected(false);
                });

                ablyRef.current.connection.on('suspended', () => {
                    console.warn('⏸️ Ably suspendu');
                    setIsConnected(false);
                });

                ablyRef.current.connection.on('failed', (err) => {
                    console.error('❌ Connexion Ably échouée:', err);
                    setIsConnected(false);
                    setError(err);
                });

                await new Promise((resolve, reject) => {
                    if (ablyRef.current.connection.state === 'connected') {
                        resolve();
                    } else {
                        ablyRef.current.connection.once('connected', resolve);
                        ablyRef.current.connection.once('failed', reject);
                    }
                });
            } catch (err) {
                console.error('❌ Erreur initialisation Ably:', err);
                setError(err);
            }
        };

        initConnection();

        return () => {
            if (ablyRef.current) {
                console.log('🔌 Fermeture connexion Ably');
                ablyRef.current.close();
                ablyRef.current = null;
            }
        };
    }, []);

    return { ably: ablyRef.current, isConnected, error };
}

export function useAblyChannel(channelName, eventHandlers = {}) {
    const { ably, isConnected } = useAblyConnection();
    const channelRef = useRef(null);
    const [isAttached, setIsAttached] = useState(false);

    useEffect(() => {
        if (!ably || !channelName || !isConnected) return;

        const setupChannel = async () => {
            try {
                console.log('📡 Configuration du channel:', channelName);
                channelRef.current = ably.channels.get(channelName);

                Object.entries(eventHandlers).forEach(([event, handler]) => {
                    console.log(`👂 Écoute de l'événement: ${event}`);
                    channelRef.current.subscribe(event, handler);
                });

                await channelRef.current.attach();
                console.log('✅ Channel attaché:', channelName);
                setIsAttached(true);
            } catch (err) {
                console.error('❌ Erreur configuration channel:', err);
                setIsAttached(false);
            }
        };

        setupChannel();

        return () => {
            if (channelRef.current) {
                console.log('🧹 Nettoyage du channel:', channelName);
                Object.keys(eventHandlers).forEach((event) => {
                    channelRef.current.unsubscribe(event);
                });
                channelRef.current.detach();
                channelRef.current = null;
                setIsAttached(false);
            }
        };
    }, [ably, channelName, isConnected]);

    const publish = useCallback(
        (event, data) => {
            if (channelRef.current && isAttached) {
                channelRef.current.publish(event, data);
            } else {
                console.warn('⚠️ Impossible de publier: channel non attaché');
            }
        },
        [isAttached]
    );

    return { channel: channelRef.current, isAttached, publish };
}

export function useConversations(userId) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchConversations = async () => {
            if (!token || !userId) return;

            try {
                setLoading(true);
                const response = await axios.get(
                    'https://beautyswap-back.vercel.app/api/conversation/user',
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const data = response.data;
                const sorted = data.sort(
                    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                );
                setConversations(sorted);
                console.log('✅ Conversations chargées:', sorted.length);
            } catch (err) {
                console.error('❌ Erreur chargement conversations:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [token, userId]);

    const eventHandlers = {
        conversationUpdated: useCallback((msg) => {
            console.log('🔄 Conversation mise à jour:', msg.data);
            setConversations((prev) => {
                const { conversationId, lastMessage, updatedAt } = msg.data;
                const updated = prev.map((conv) =>
                    conv._id === conversationId
                        ? {
                            ...conv,
                            messages: [...(conv.messages || []), lastMessage],
                            updatedAt: updatedAt || new Date(),
                        }
                        : conv
                );
                return updated.sort(
                    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                );
            });
        }, []),

        conversationCreated: useCallback((msg) => {
            console.log('➕ Nouvelle conversation:', msg.data);
            setConversations((prev) => {
                const exists = prev.some(
                    (conv) => conv._id === msg.data.conversation._id
                );
                return exists ? prev : [msg.data.conversation, ...prev];
            });
        }, []),

        conversationDeleted: useCallback((msg) => {
            console.log('🗑️ Conversation supprimée:', msg.data.conversationId);
            setConversations((prev) =>
                prev.filter((conv) => conv._id !== msg.data.conversationId)
            );
        }, []),

        messagesRead: useCallback((msg) => {
            console.log('👁️ Messages marqués comme lus:', msg.data);
            setConversations((prev) =>
                prev.map((conv) =>
                    conv._id === msg.data.conversationId
                        ? {
                            ...conv,
                            messages: conv.messages.map((m) =>
                                m.sender?._id !== userId ? { ...m, read: true } : m
                            ),
                        }
                        : conv
                )
            );
        }, [userId]),
    };

    useAblyChannel(userId ? `user:${userId}` : null, eventHandlers);

    return { conversations, loading, setConversations };
}

export function useMessages(conversationId) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchMessages = async () => {
            if (!conversationId) return;

            setLoading(true);
            try {
                const response = await axios.get(
                    `https://beautyswap-back.vercel.app/api/conversation/${conversationId}/messages`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const data = response.data;
                setMessages(data.messages || []);
                console.log('✅ Messages chargés:', data.messages?.length || 0);

                await axios.put(
                    `https://beautyswap-back.vercel.app/api/conversation/${conversationId}/read`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
            } catch (err) {
                console.error('❌ Erreur chargement messages:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [conversationId, token]);

    const eventHandlers = {
        newMessage: useCallback((msg) => {
            console.log('📩 Nouveau message:', msg.data);
            setMessages((prev) => {
                const messageId = msg.data._id || msg.data.id;
                const exists = prev.some(
                    (m) => (m._id || m.id)?.toString() === messageId?.toString()
                );
                return exists ? prev : [...prev, msg.data];
            });
        }, []),

        messageDeleted: useCallback((msg) => {
            console.log('🗑️ Message supprimé:', msg.data.messageId);
            setMessages((prev) => prev.filter((m) => m._id !== msg.data.messageId));
        }, []),

        messageUpdated: useCallback((msg) => {
            console.log('✏️ Message modifié:', msg.data);
            setMessages((prev) =>
                prev.map((m) => (m._id === msg.data._id ? { ...m, ...msg.data } : m))
            );
        }, []),
    };

    useAblyChannel(
        conversationId ? `conversation:${conversationId}` : null,
        eventHandlers
    );

    const addMessage = useCallback((newMessage) => {
        setMessages((prev) => {
            const exists = prev.some((m) => m._id === newMessage._id);
            return exists ? prev : [...prev, newMessage];
        });
    }, []);

    return { messages, loading, addMessage };
}

export default function ChatDemo() {
    const [activeConversation, setActiveConversation] = useState(null);
    const [messageText, setMessageText] = useState(""); // 🆕
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?._id || user?.id;

    const { conversations, loading: loadingConversations } = useConversations(userId);
    const { messages, loading: loadingMessages, addMessage } = useMessages(activeConversation);

    const sendMessage = async () => {
        if (!messageText.trim() || !activeConversation) return;
        const token = localStorage.getItem("token");

        try {
            // 🔹 Envoi au backend
            const response = await axios.post(
                `https://beautyswap-back.vercel.app/api/conversation/${activeConversation}/messages`,
                { content: messageText },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newMessage = response.data;

            // 🔹 Ajout immédiat local (pour voir ton msg sans attendre Ably)
            addMessage(newMessage);

            // 🔹 Reset input
            setMessageText("");
        } catch (err) {
            console.error("❌ Erreur envoi message:", err);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', gap: '20px', padding: '20px' }}>
            <div style={{ width: '300px', borderRight: '1px solid #ddd' }}>
                <h2>Conversations</h2>
                {loadingConversations ? (
                    <p>Chargement...</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {conversations.map((conv) => (
                            <li
                                key={conv._id}
                                onClick={() => setActiveConversation(conv._id)}
                                style={{
                                    padding: '10px',
                                    cursor: 'pointer',
                                    backgroundColor: activeConversation === conv._id ? '#e3f2fd' : 'white',
                                    borderBottom: '1px solid #eee',
                                }}
                            >
                                {conv.participant1?.firstname || 'Conversation'}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {activeConversation ? (
                    <>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {loadingMessages ? (
                                <p>Chargement des messages...</p>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg._id} style={{ marginBottom: '10px' }}>
                                        <strong>{msg.sender?.firstname}: </strong>
                                        {msg.content}
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ padding: '20px', borderTop: '1px solid #ddd', display: "flex", gap: "10px" }}>
                            <input
                                type="text"
                                placeholder="Écrivez un message..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                style={{ flex: 1, padding: '10px' }}
                            />
                            <button onClick={sendMessage}>Envoyer</button>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <p>Sélectionnez une conversation</p>
                    </div>
                )}
            </div>
        </div>
    );
}
