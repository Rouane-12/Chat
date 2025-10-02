import { useState, useRef } from "react";
import axios from "../axiosConfig";

function MessageInput({ conversationId, onSend }) {
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!content.trim() && files.length === 0) return;

        setSending(true);
        setError(null);

        try {
            const formData = new FormData();

            if (content.trim()) {
                formData.append("content", content.trim());
            }

            files.forEach((file) => {
                formData.append("files", file);
            });

            console.log("📤 Envoi du message...");

            const response = await axios.post(
                `https://beautyswap-back.vercel.app/api/conversation/${conversationId}/messages`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            console.log("✅ Message envoyé:", response.data);

            if (onSend && response.data) {
                onSend(response.data);
            }

            setContent("");
            setFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

        } catch (err) {
            console.error("❌ Erreur envoi message:", err);
            setError(err.response?.data?.message || "Erreur lors de l'envoi du message");
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);

        const validFiles = selectedFiles.filter(file => {
            if (file.size > 10 * 1024 * 1024) {
                console.warn(`⚠️ Fichier trop volumineux: ${file.name}`);
                return false;
            }
            return true;
        });

        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{
            padding: "1rem",
            borderTop: "1px solid #ddd",
            backgroundColor: "#f9f9f9"
        }}>
            {error && (
                <div style={{
                    marginBottom: "0.5rem",
                    padding: "0.5rem",
                    backgroundColor: "#fee",
                    color: "#c00",
                    borderRadius: "4px",
                    fontSize: "0.9rem"
                }}>
                    ⚠️ {error}
                </div>
            )}

            {files.length > 0 && (
                <div style={{
                    marginBottom: "0.5rem",
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap"
                }}>
                    {files.map((file, index) => (
                        <div key={index} style={{
                            position: "relative",
                            padding: "0.5rem",
                            backgroundColor: "#e0e0e0",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}>
                            <span style={{
                                maxWidth: "150px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                            }}>
                                {file.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                style={{
                                    cursor: "pointer",
                                    background: "none",
                                    border: "none",
                                    color: "red",
                                    fontSize: "1.2rem",
                                    padding: 0,
                                    lineHeight: 1
                                }}
                                title="Supprimer"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
                <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Écrivez votre message... (Ctrl+Enter pour envoyer)"
                    disabled={sending}
                    style={{
                        flex: 1,
                        padding: "0.75rem",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#007bff"}
                    onBlur={(e) => e.target.style.borderColor = "#ccc"}
                />

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    style={{ display: "none" }}
                    id="file-input"
                    disabled={sending}
                />

                <label
                    htmlFor="file-input"
                    style={{
                        padding: "0.75rem 1rem",
                        backgroundColor: sending ? "#ccc" : "#6c757d",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: sending ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => !sending && (e.target.style.backgroundColor = "#5a6268")}
                    onMouseLeave={(e) => !sending && (e.target.style.backgroundColor = "#6c757d")}
                    title="Joindre un fichier"
                >
                    📎
                </label>

                <button
                    type="submit"
                    disabled={sending || (!content.trim() && files.length === 0)}
                    style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: sending || (!content.trim() && files.length === 0) ? "#ccc" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: (sending || (!content.trim() && files.length === 0)) ? "not-allowed" : "pointer",
                        fontWeight: "bold",
                        transition: "background-color 0.2s",
                        minWidth: "100px"
                    }}
                    onMouseEnter={(e) => {
                        if (!sending && (content.trim() || files.length > 0)) {
                            e.target.style.backgroundColor = "#0056b3";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!sending && (content.trim() || files.length > 0)) {
                            e.target.style.backgroundColor = "#007bff";
                        }
                    }}
                >
                    {sending ? "⏳ Envoi..." : "Envoyer"}
                </button>
            </div>
        </form>
    );
}

export default MessageInput;