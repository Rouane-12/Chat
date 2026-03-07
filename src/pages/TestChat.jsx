import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const API_URL = "https://backend-bs.evans-djossouvi.com";

const token = localStorage.getItem("token");
if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

function decodeToken(t) {
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return {
      id: payload.id || payload._id,
      username: payload.username || "Moi",
      avatar: payload.avatar || null,
    };
  } catch {
    return null;
  }
}
const CURRENT_USER = decodeToken(token) || {
  id: null,
  username: "Moi",
  avatar: null,
};

const api = {
  getConversations: () =>
    axios.get(`${API_URL}/api/conversations`).then((r) => r.data.data),

  getConversation: (id, page = 1) =>
    axios
      .get(`${API_URL}/api/conversations/${id}?page=${page}&limit=30`)
      .then((r) => r.data.data),

  getUnreadCount: () =>
    axios
      .get(`${API_URL}/api/conversations/unread`)
      .then((r) => r.data.unreadCount),

  deleteConversation: (id) =>
    axios.delete(`${API_URL}/api/conversations/${id}`).then((r) => r.data),
};

let socketInstance = null;
function getSocket() {
  if (!socketInstance) {
    socketInstance = io(API_URL, {
      auth: { token: localStorage.getItem("token") },
      autoConnect: true,
    });
  }
  return socketInstance;
}

function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    if (s.connected) setConnected(true);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, connected };
}

function formatTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < 86400000)
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function getInitial(name) {
  return name ? name[0].toUpperCase() : "?";
}

function getOtherParticipant(conv, myId) {
  const p1id = conv.participant1?._id || conv.participant1?.id;
  return p1id?.toString() === myId?.toString()
    ? conv.participant2
    : conv.participant1;
}

function Avatar({ user, size = 40, online = false }) {
  const colors = [
    "#E85D3D",
    "#3D7EE8",
    "#3DCE89",
    "#CE3D9E",
    "#E8C03D",
    "#8B3DE8",
  ];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Mono', monospace",
          fontSize: size * 0.4,
          fontWeight: 600,
          color: "#fff",
          letterSpacing: "-0.5px",
        }}
      >
        {getInitial(user?.username)}
      </div>
      {online && (
        <div
          style={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: "50%",
            background: "#22C55E",
            border: "2px solid #0F0F0F",
          }}
        />
      )}
    </div>
  );
}

function NegotiationBubble({ msg, isMine, onAccept, onCounter, onRefund }) {
  const { negotiationPart, product } = msg;
  const [counterVal, setCounterVal] = useState("");
  const [showCounter, setShowCounter] = useState(false);
  const statusColors = {
    pending: "#F59E0B",
    accepted: "#22C55E",
    refunded: "#EF4444",
    counterOffer: "#8B5CF6",
  };
  const statusLabels = {
    pending: "En attente",
    accepted: "Acceptée ✓",
    refunded: "Annulée",
    counterOffer: "Contre-offre",
  };

  return (
    <div
      style={{
        background: isMine ? "#1A1A2E" : "#1E1E1E",
        border: `1px solid ${statusColors[negotiationPart.status]}33`,
        borderRadius: 12,
        padding: "12px 16px",
        minWidth: 240,
        maxWidth: 300,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>🤝</span>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "#888",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Négociation
        </span>
      </div>
      {product && (
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 13,
            color: "#aaa",
            marginBottom: 6,
          }}
        >
          {product.title}
          {product.price && (
            <span style={{ color: "#666", marginLeft: 6 }}>
              · Prix : {product.price}€
            </span>
          )}
        </div>
      )}
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 8,
        }}
      >
        {negotiationPart.amount}€
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: `${statusColors[negotiationPart.status]}18`,
          border: `1px solid ${statusColors[negotiationPart.status]}44`,
          borderRadius: 20,
          padding: "3px 10px",
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: statusColors[negotiationPart.status],
        }}
      >
        {statusLabels[negotiationPart.status]}
      </div>

      {!isMine && negotiationPart.status === "pending" && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {!showCounter ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={onAccept} style={btnStyle("#22C55E")}>
                Accepter
              </button>
              <button
                onClick={() => setShowCounter(true)}
                style={btnStyle("#8B5CF6")}
              >
                Contre-offre
              </button>
              <button onClick={onRefund} style={btnStyle("#EF4444")}>
                Refuser
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number"
                value={counterVal}
                onChange={(e) => setCounterVal(e.target.value)}
                placeholder="Montant €"
                style={{
                  flex: 1,
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "#fff",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  onCounter(Number(counterVal));
                  setShowCounter(false);
                  setCounterVal("");
                }}
                style={btnStyle("#8B5CF6")}
              >
                →
              </button>
              <button
                onClick={() => setShowCounter(false)}
                style={btnStyle("#444")}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function btnStyle(color) {
  return {
    background: `${color}22`,
    border: `1px solid ${color}55`,
    borderRadius: 8,
    padding: "5px 10px",
    color: color,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    cursor: "pointer",
    fontWeight: 600,
    letterSpacing: 0.5,
    transition: "all 0.15s",
  };
}

function MessageBubble({ msg, isMine, onAccept, onCounter, onRefund }) {
  if (msg.isNegotiationPart && msg.negotiationPart) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: isMine ? "flex-end" : "flex-start",
        }}
      >
        <div>
          <NegotiationBubble
            msg={msg}
            isMine={isMine}
            onAccept={onAccept}
            onCounter={onCounter}
            onRefund={onRefund}
          />
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              color: "#444",
              textAlign: isMine ? "right" : "left",
              marginTop: 4,
            }}
          >
            {formatTime(msg.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
      }}
    >
      <div style={{ maxWidth: "65%" }}>
        <div
          style={{
            background: isMine ? "#E85D3D" : "#1E1E1E",
            borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            padding: "10px 14px",
            fontFamily: "'Syne', sans-serif",
            fontSize: 14,
            color: isMine ? "#fff" : "#d4d4d4",
            lineHeight: 1.5,
          }}
        >
          {msg.text}
        </div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: "#444",
            textAlign: isMine ? "right" : "left",
            marginTop: 4,
            display: "flex",
            justifyContent: isMine ? "flex-end" : "flex-start",
            gap: 4,
            alignItems: "center",
          }}
        >
          {formatTime(msg.createdAt)}
          {isMine && (
            <span style={{ color: msg.read ? "#E85D3D" : "#444" }}>
              {msg.read ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationList({ conversations, activeId, onSelect, onlineUsers }) {
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "0 8px" }}>
      {conversations.length === 0 && (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "#444",
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
          }}
        >
          Aucune conversation
        </div>
      )}
      {conversations.map((conv) => {
        const other = getOtherParticipant(conv, CURRENT_USER.id);
        const last = conv.messages?.[0];
        const isActive = conv._id === activeId;
        const otherId = other?._id || other?.id;
        const isOnline = onlineUsers.has(otherId?.toString());

        return (
          <div
            key={conv._id}
            onClick={() => onSelect(conv._id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 12px",
              borderRadius: 12,
              cursor: "pointer",
              marginBottom: 2,
              background: isActive ? "#1A1A1A" : "transparent",
              borderLeft: isActive
                ? "3px solid #E85D3D"
                : "3px solid transparent",
              transition: "all 0.15s",
            }}
          >
            <Avatar user={other} size={44} online={isOnline} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: isActive ? "#fff" : "#ccc",
                  }}
                >
                  {other.username}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    color: "#444",
                  }}
                >
                  {last ? formatTime(last.createdAt) : ""}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 12,
                    color: "#555",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 140,
                  }}
                >
                  {(last?.sender?.id || last?.sender?._id)?.toString() ===
                  CURRENT_USER.id?.toString()
                    ? "Vous : "
                    : ""}
                  {last?.isNegotiationPart
                    ? `🤝 ${last?.negotiationPart?.amount || ""}€`
                    : last?.text}
                </span>
                {conv.unreadCount > 0 && (
                  <span
                    style={{
                      background: "#E85D3D",
                      color: "#fff",
                      borderRadius: 10,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      flexShrink: 0,
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChatWindow({
  conversationId,
  conversations,
  messages,
  setMessages,
  socket,
  onSendMessage,
  loading,
}) {
  const [input, setInput] = useState("");
  const [showNegModal, setShowNegModal] = useState(false);
  const [negAmount, setNegAmount] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const conv = conversations.find((c) => c._id === conversationId);
  const other = conv ? getOtherParticipant(conv, CURRENT_USER.id) : null;
  // MongoDB retourne _id, normaliser
  const otherId = other?._id || other?.id;
  const msgs = messages[conversationId] || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const handleSend = () => {
    if (!input.trim()) return;
    const optimistic = {
      _id: `opt_${Date.now()}`,
      sender: CURRENT_USER,
      receiver: other,
      messageType: "text",
      text: input.trim(),
      createdAt: new Date(),
      read: false,
    };
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimistic],
    }));
    onSendMessage({
      receiverId: otherId,
      messageType: "text",
      text: input.trim(),
    });
    setInput("");
    inputRef.current?.focus();
  };

  const handleNegotiation = () => {
    if (!negAmount || Number(negAmount) <= 0) return;
    const optimistic = {
      _id: `opt_neg_${Date.now()}`,
      sender: CURRENT_USER,
      receiver: other,
      messageType: "text",
      text: "Négociation",
      isNegotiationPart: true,
      negotiationPart: {
        _id: `neg_opt_${Date.now()}`,
        amount: Number(negAmount),
        status: "pending",
      },
      product: { title: "Produit", price: null },
      createdAt: new Date(),
      read: false,
    };
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimistic],
    }));
    // Émettre via socket
    if (socket)
      socket.emit("negotiation:start", {
        receiverId: otherId,
        productId: conv?.product?._id || null,
        amount: Number(negAmount),
      });
    setShowNegModal(false);
    setNegAmount("");
  };

  const handleAccept = (msgId) => {
    setMessages((prev) => ({
      ...prev,
      [conversationId]: prev[conversationId].map((m) =>
        m._id === msgId
          ? {
              ...m,
              negotiationPart: { ...m.negotiationPart, status: "accepted" },
            }
          : m,
      ),
    }));
    if (socket) socket.emit("negotiation:accept", { messageId: msgId });
  };

  const handleRefund = (msgId) => {
    setMessages((prev) => ({
      ...prev,
      [conversationId]: prev[conversationId].map((m) =>
        m._id === msgId
          ? {
              ...m,
              negotiationPart: { ...m.negotiationPart, status: "refunded" },
            }
          : m,
      ),
    }));
    if (socket) socket.emit("negotiation:refund", { messageId: msgId });
  };

  const handleCounter = (msgId, amount) => {
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [
        ...prev[conversationId].map((m) =>
          m._id === msgId
            ? {
                ...m,
                negotiationPart: {
                  ...m.negotiationPart,
                  status: "counterOffer",
                },
              }
            : m,
        ),
        {
          _id: `opt_neg_${Date.now()}`,
          sender: CURRENT_USER,
          messageType: "text",
          text: "Négociation",
          isNegotiationPart: true,
          negotiationPart: {
            _id: `neg_opt_${Date.now()}`,
            amount,
            status: "pending",
          },
          product: prev[conversationId].find((m) => m._id === msgId)?.product,
          createdAt: new Date(),
          read: false,
        },
      ],
    }));
    if (socket)
      socket.emit("negotiation:counterOffer", {
        messageId: msgId,
        newAmount: amount,
      });
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  msgs.forEach((msg) => {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== lastDate) {
      grouped.push({ type: "date", date: msg.createdAt });
      lastDate = d;
    }
    grouped.push({ type: "msg", msg });
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #1A1A1A",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {other && <Avatar user={other} size={40} online={false} />}
        <div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: "#fff",
            }}
          >
            {other?.username}
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "#444",
            }}
          >
            {loading ? "Chargement…" : `${msgs.length} messages`}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {grouped.map((item, i) => {
          if (item.type === "date") {
            const label = new Date(item.date).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            });
            return (
              <div
                key={`date-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  margin: "8px 0",
                }}
              >
                <div style={{ flex: 1, height: 1, background: "#1A1A1A" }} />
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    color: "#333",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {label}
                </span>
                <div style={{ flex: 1, height: 1, background: "#1A1A1A" }} />
              </div>
            );
          }
          const msg = item.msg;
          const isMine =
            (msg.sender?.id || msg.sender?._id) === CURRENT_USER.id;
          return (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isMine={isMine}
              onAccept={() => handleAccept(msg._id)}
              onCounter={(amount) => handleCounter(msg._id, amount)}
              onRefund={() => handleRefund(msg._id)}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #1A1A1A",
          flexShrink: 0,
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <button
          onClick={() => setShowNegModal(true)}
          title="Proposer une négociation"
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 10,
            padding: "10px 12px",
            cursor: "pointer",
            fontSize: 16,
            flexShrink: 0,
            transition: "all 0.15s",
            color: "#888",
          }}
        >
          🤝
        </button>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Écrire un message…"
            rows={1}
            style={{
              width: "100%",
              background: "#111",
              border: "1px solid #222",
              borderRadius: 12,
              padding: "10px 14px",
              color: "#d4d4d4",
              fontFamily: "'Syne', sans-serif",
              fontSize: 14,
              outline: "none",
              resize: "none",
              lineHeight: 1.5,
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            background: input.trim() ? "#E85D3D" : "#1A1A1A",
            border: "none",
            borderRadius: 10,
            padding: "10px 16px",
            cursor: input.trim() ? "pointer" : "default",
            color: input.trim() ? "#fff" : "#333",
            fontFamily: "'DM Mono', monospace",
            fontSize: 18,
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          →
        </button>
      </div>

      {/* Negotiation modal */}
      {showNegModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000000aa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setShowNegModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 20,
              padding: 28,
              minWidth: 320,
            }}
          >
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: "#fff",
                marginBottom: 6,
              }}
            >
              🤝 Proposer une offre
            </div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: "#555",
                marginBottom: 20,
                letterSpacing: 0.5,
              }}
            >
              À {other?.username?.toUpperCase()}
            </div>
            <input
              type="number"
              value={negAmount}
              onChange={(e) => setNegAmount(e.target.value)}
              placeholder="Montant en €"
              autoFocus
              style={{
                width: "100%",
                background: "#0A0A0A",
                border: "1px solid #2A2A2A",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#fff",
                fontFamily: "'DM Mono', monospace",
                fontSize: 20,
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 16,
                textAlign: "center",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowNegModal(false)}
                style={{
                  flex: 1,
                  background: "#1A1A1A",
                  border: "1px solid #2A2A2A",
                  borderRadius: 10,
                  padding: 12,
                  color: "#666",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleNegotiation}
                disabled={!negAmount || Number(negAmount) <= 0}
                style={{
                  flex: 2,
                  background: "#E85D3D",
                  border: "none",
                  borderRadius: 10,
                  padding: 12,
                  color: "#fff",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Envoyer l'offre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 48, opacity: 0.15 }}>💬</div>
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          color: "#333",
        }}
      >
        Sélectionne une conversation
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: "#2A2A2A",
          letterSpacing: 0.5,
        }}
      >
        ou commence une nouvelle discussion
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState(null);
  const { socket, connected } = useSocket();

  // ─── Charger les conversations via axios au mount ───────────────────────────
  useEffect(() => {
    setLoadingConvs(true);
    api
      .getConversations()
      .then((data) => setConversations(data || []))
      .catch((err) =>
        setError(err.response?.data?.message || "Erreur de chargement"),
      )
      .finally(() => setLoadingConvs(false));
  }, []);

  // ─── Charger les messages d'une conversation via axios ──────────────────────
  const loadMessages = useCallback(
    async (convId) => {
      if (messages[convId]) return; // déjà chargés
      setLoadingMsgs(true);
      try {
        const data = await api.getConversation(convId);
        // L'API retourne messages dans l'ordre inverse (sort: -1), on remet à l'endroit
        const msgs = [...(data.messages || [])].reverse();
        setMessages((prev) => ({ ...prev, [convId]: msgs }));
      } catch (err) {
        setError(err.response?.data?.message || "Erreur chargement messages");
      } finally {
        setLoadingMsgs(false);
      }
    },
    [messages],
  );

  // ─── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Présence
    socket.on("user:online", ({ userId }) =>
      setOnlineUsers((prev) => new Set([...prev, userId])),
    );
    socket.on("user:offline", ({ userId }) =>
      setOnlineUsers((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      }),
    );

    // Nouveau message reçu
    socket.on("message:new", ({ message, conversationId }) => {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), message],
      }));
      setConversations((prev) =>
        prev
          .map((c) =>
            c._id === conversationId
              ? {
                  ...c,
                  messages: [message],
                  unreadCount: (c.unreadCount || 0) + 1,
                  updatedAt: message.createdAt,
                }
              : c,
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      );
    });

    // Confirmation envoi (remplace l'optimiste)
    socket.on("message:sent", ({ message, conversationId }) => {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map((m) =>
          m._id?.startsWith("opt_") && m.text === message.text ? message : m,
        ),
      }));
      setConversations((prev) =>
        prev
          .map((c) =>
            c._id === conversationId
              ? { ...c, messages: [message], updatedAt: message.createdAt }
              : c,
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      );
    });

    // Négociation reçue
    socket.on("negotiation:new", ({ message, conversationId }) => {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), message],
      }));
      setConversations((prev) =>
        prev
          .map((c) =>
            c._id === conversationId
              ? {
                  ...c,
                  messages: [message],
                  unreadCount: (c.unreadCount || 0) + 1,
                  updatedAt: message.createdAt,
                }
              : c,
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      );
    });

    // Mise à jour statut négociation
    socket.on("negotiation:update", ({ messageId, status }) => {
      setMessages((prev) => {
        const updated = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[cid] = msgs.map((m) =>
            m._id === messageId
              ? { ...m, negotiationPart: { ...m.negotiationPart, status } }
              : m,
          );
        }
        return updated;
      });
    });

    // Lu par le receiver
    socket.on("message:read:ack", ({ messageIds }) => {
      setMessages((prev) => {
        const updated = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[cid] = msgs.map((m) =>
            messageIds.includes(m._id) ? { ...m, read: true } : m,
          );
        }
        return updated;
      });
    });

    return () => {
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("message:new");
      socket.off("message:sent");
      socket.off("negotiation:new");
      socket.off("negotiation:update");
      socket.off("message:read:ack");
    };
  }, [socket]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    ({ receiverId, messageType, text }) => {
      if (!socket || !connected) return;
      socket.emit("message:send", { receiverId, messageType, text });
    },
    [socket, connected],
  );

  const handleSelectConversation = useCallback(
    (id) => {
      setActiveConversation(id);
      setConversations((prev) =>
        prev.map((c) => (c._id === id ? { ...c, unreadCount: 0 } : c)),
      );
      loadMessages(id);
      // Marquer les messages non lus comme lus
      const unread = (messages[id] || [])
        .filter(
          (m) => !m.read && (m.receiver?._id || m.receiver) === CURRENT_USER.id,
        )
        .map((m) => m._id);
      if (unread.length > 0 && socket)
        socket.emit("message:read", { messageIds: unread });
    },
    [loadMessages, messages, socket],
  );

  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0,
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A0A; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E1E1E; border-radius: 4px; }
        textarea { scrollbar-width: none; }
      `}</style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          background: "#0A0A0A",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 300,
            background: "#0D0D0D",
            borderRight: "1px solid #141414",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: "20px 16px 16px",
              borderBottom: "1px solid #141414",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#fff",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Messages
                  {totalUnread > 0 && (
                    <span
                      style={{
                        background: "#E85D3D",
                        borderRadius: 10,
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 10,
                        padding: "2px 7px",
                        marginLeft: 8,
                        color: "#fff",
                      }}
                    >
                      {totalUnread}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    color: "#333",
                    marginTop: 2,
                    letterSpacing: 1,
                  }}
                >
                  {connected ? "● CONNECTÉ" : "○ HORS LIGNE"}
                </div>
              </div>
              <Avatar user={CURRENT_USER} size={34} online={true} />
            </div>
          </div>

          {/* Conversations */}
          <div style={{ flex: 1, overflowY: "auto", paddingTop: 8 }}>
            {loadingConvs ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#333",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                }}
              >
                Chargement…
              </div>
            ) : error ? (
              <div
                style={{
                  padding: "20px",
                  color: "#EF4444",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                activeId={activeConversation}
                onSelect={handleSelectConversation}
                onlineUsers={onlineUsers}
              />
            )}
          </div>
        </div>

        {/* Main */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {activeConversation ? (
            <ChatWindow
              conversationId={activeConversation}
              conversations={conversations}
              messages={messages}
              setMessages={setMessages}
              socket={socket}
              onSendMessage={handleSendMessage}
              loading={loadingMsgs}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </>
  );
}
