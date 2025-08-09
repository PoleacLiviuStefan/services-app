"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Send, ArrowLeft, Circle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  generateConversationId,
  extractUserSlug,
  createConversationUrl,
  isValidSlug,
  debugUser,
} from "@/utils/userResolver";

interface Message {
  id: string;
  content: string;
  fromUsername: string;
  toUsername: string;
  fromUserSlug?: string;
  toUserSlug?: string;
  createdAt: string;
  isFromCurrentUser?: boolean; // Nou câmp din API
  sender?: {
    // Informații îmbogățite despre expeditor
    slug?: string;
    name: string;
    image?: string;
  };
  receiver?: {
    // Informații îmbogățite despre destinatar
    slug?: string;
    name: string;
    image?: string;
  };
}

interface RecipientUser {
  name: string;
  slug: string;
  email?: string;
  image?: string;
}

export default function ConversatiePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const { t } = useTranslation();
  // Slug-ul destinatarului din URL
  const recipientSlug = params.name as string;

  const [recipientInfo, setRecipientInfo] = useState<RecipientUser | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messagesOffset, setMessagesOffset] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Obține slug-ul utilizatorului curent din sesiunea NextAuth
  const currentUserSlug = extractUserSlug(session?.user);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll la bottom doar pentru mesaje noi, nu pentru cele încărcate cu "Load more"
  const shouldScrollToBottom = useRef(true);

  useEffect(() => {
    if (shouldScrollToBottom.current) {
      scrollToBottom();
    }
    // Reset flag după scroll
    shouldScrollToBottom.current = true;
  }, [messages]);

  // Debug info pentru utilizatorul curent
  useEffect(() => {
    if (session?.user) {
      debugUser(session.user, "Current User from Session");
    }
  }, [session]);

  // Validează și încarcă informațiile destinatarului
  useEffect(() => {
    const loadRecipientInfo = async () => {
      if (!recipientSlug) {
        setError("Slug destinatar lipsește");
        setLoading(false);
        return;
      }

      // Validează formatul slug-ului
      if (!isValidSlug(recipientSlug)) {
        setError("Formatul slug-ului este invalid");
        setLoading(false);
        return;
      }

      try {
        // Obține informații despre destinatar din API
        const response = await fetch(
          `/api/users/by-slug/${encodeURIComponent(recipientSlug)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Utilizatorul nu a fost găsit");
          } else {
            setError("Eroare la încărcarea informațiilor utilizatorului");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.success && data.user) {
          setRecipientInfo(data.user);
          setLoading(false);
        } else {
          setError("Utilizatorul nu a fost găsit");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading recipient info:", error);
        setError("Eroare la încărcarea informațiilor utilizatorului");
        setLoading(false);
      }
    };

    loadRecipientInfo();
  }, [recipientSlug]);

  // Funcție pentru a încărca mesajele anterioare
  const loadPreviousMessages = async (
    currentSlug: string,
    targetSlug: string,
    offset = 0,
    isLoadMore = false
  ): Promise<void> => {
    try {
      if (isLoadMore) {
        setLoadingOlderMessages(true);
      } else {
        setMessagesLoading(true);
      }

      const response = await fetch(
        `/api/chat/conversation?user1=${encodeURIComponent(
          currentSlug
        )}&user2=${encodeURIComponent(targetSlug)}&limit=50&offset=${offset}`
      );
      const data = await response.json();

      if (data.success) {
        const newMessages = data.messages || [];

        if (isLoadMore) {
          // Pentru "Load more", adaugă mesajele mai vechi la începutul listei
          setMessages((prev) => [...newMessages, ...prev]);
          // Verifică dacă mai sunt mesaje de încărcat din API response
          setHasMoreMessages(data.meta?.hasMoreMessages || false);
          setMessagesOffset((prev) => prev + newMessages.length);
        } else {
          // Pentru încărcarea inițială - ultimele 50 de mesaje
          setMessages(newMessages);
          setHasMoreMessages(data.meta?.hasMoreMessages || false);
          setMessagesOffset(newMessages.length);
        }
      } else {
        console.error("Error loading messages:", data.error);
      }
    } catch (error) {
      console.error("Error loading previous messages:", error);
    } finally {
      if (isLoadMore) {
        setLoadingOlderMessages(false);
      } else {
        setMessagesLoading(false);
      }
    }
  };

  // Funcție pentru încărcarea mesajelor mai vechi
  const loadOlderMessages = () => {
    if (
      !currentUserSlug ||
      !recipientInfo?.slug ||
      !hasMoreMessages ||
      loadingOlderMessages
    ) {
      return;
    }

    // Salvează poziția scroll curentă pentru a o restabili după încărcarea mesajelor
    const chatContainer = chatContainerRef.current;
    const scrollHeightBefore = chatContainer?.scrollHeight || 0;

    // Nu face scroll automat când se încarcă mesaje vechi
    shouldScrollToBottom.current = false;

    loadPreviousMessages(
      currentUserSlug,
      recipientInfo.slug,
      messagesOffset,
      true
    ).then(() => {
      // Restabilește poziția scroll după încărcarea mesajelor
      if (chatContainer) {
        const scrollHeightAfter = chatContainer.scrollHeight;
        const heightDifference = scrollHeightAfter - scrollHeightBefore;
        chatContainer.scrollTop = heightDifference;
      }
    });
  };

  // Funcție pentru a conecta la SSE
  const connectEventSource = (currentSlug: string, targetSlug: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Generează conversationId folosind slug-urile
    const conversationId = generateConversationId(currentSlug, targetSlug);
    const eventSourceUrl = `/api/chat/conversation/events?user=${encodeURIComponent(
      currentSlug
    )}&conversation=${encodeURIComponent(conversationId)}`;

    console.log("🔌 Connecting to SSE:", {
      currentSlug,
      targetSlug,
      conversationId,
      eventSourceUrl,
    });

    const eventSource = new EventSource(eventSourceUrl);

    eventSource.onopen = () => {
      console.log("EventSource connected for conversation:", conversationId);
      setIsConnected(true);
      setError("");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 SSE Message received:", data);

        switch (data.type) {
          case "connected":
            console.log("✅ Connected to conversation:", data.conversationId);
            break;

          case "message":
            // Verifică dacă mesajul aparține conversației curente
            const message = data.message;
            if (message && recipientInfo) {
              const belongsToConversation =
                (message.fromUserSlug === currentUserSlug &&
                  message.toUserSlug === recipientInfo.slug) ||
                (message.fromUserSlug === recipientInfo.slug &&
                  message.toUserSlug === currentUserSlug) ||
                // Fallback pentru mesaje vechi fără slug
                (message.fromUsername === session?.user?.name &&
                  message.toUsername === recipientInfo.name) ||
                (message.fromUsername === recipientInfo.name &&
                  message.toUsername === session?.user?.name);

              if (belongsToConversation) {
                console.log("✅ Adding new message via SSE:", message.content);
                // Mesajele din SSE sunt noi și se adaugă la sfârșit
                shouldScrollToBottom.current = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: message.id,
                    content: message.content,
                    fromUsername:
                      message.fromUsername || message.sender?.name || "",
                    toUsername:
                      message.toUsername || message.receiver?.name || "",
                    fromUserSlug: message.fromUserSlug || message.sender?.slug,
                    toUserSlug: message.toUserSlug || message.receiver?.slug,
                    createdAt: message.createdAt,
                    isFromCurrentUser:
                      message.fromUserSlug === currentUserSlug ||
                      message.fromUsername === session?.user?.name,
                    sender: message.sender,
                    receiver: message.receiver,
                  },
                ]);
              } else {
                console.log("⚠️ Message not for this conversation");
              }
            }
            break;

          case "userOnline":
            if (data.userSlug === recipientInfo?.slug) {
              console.log("👤 Recipient came online");
              setRecipientOnline(true);
            }
            break;

          case "userOffline":
            if (data.userSlug === recipientInfo?.slug) {
              console.log("👤 Recipient went offline");
              setRecipientOnline(false);
            }
            break;

          case "heartbeat":
            // Heartbeat pentru a menține conexiunea
            console.log("💓 Heartbeat received");
            break;

          default:
            console.log("❓ Unknown SSE message type:", data.type);
        }
      } catch (error) {
        console.error("❌ Error parsing SSE event data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
      setIsConnected(false);
      eventSource.close();

      // Încearcă să se reconecteze după 3 secunde
      setTimeout(() => {
        if (currentSlug && targetSlug) {
          connectEventSource(currentSlug, targetSlug);
        }
      }, 3000);
    };

    eventSourceRef.current = eventSource;
  };

  // Inițializare la mount
  useEffect(() => {
    const initializeChat = async () => {
      // Verifică dacă încă se încarcă informațiile destinatarului
      if (loading) {
        return;
      }

      // Verifică status-ul de autentificare
      if (status === "loading") {
        return; // Așteaptă să se încarce sesiunea
      }

      if (status === "unauthenticated" || !session?.user) {
        setError("Trebuie să te autentifici pentru a accesa conversația");
        return;
      }

      const currentSlug = extractUserSlug(session.user);

      // Verifică dacă utilizatorul curent are slug
      if (!currentSlug) {
        setError(
          "Contul tău nu are un slug valid. Te rugăm să contactezi suportul."
        );
        return;
      }

      // Verifică dacă destinatarul este valid
      if (!recipientInfo || !recipientInfo.slug) {
        setError("Destinatar invalid");
        return;
      }

      // Verifică să nu încerce să converseze cu sine
      if (currentSlug === recipientInfo.slug) {
        setError("Nu poți conversa cu tine însuți");
        return;
      }

      // Încarcă mesajele și conectează-te la SSE folosind slug-urile
      await loadPreviousMessages(currentSlug, recipientInfo.slug, 0, false);
      connectEventSource(currentSlug, recipientInfo.slug);
    };

    initializeChat();

    // Cleanup la unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [recipientInfo, session, status, loading]);

  // Funcție pentru trimiterea mesajelor
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected || !recipientInfo?.slug) return;

    try {
      const response = await fetch("/api/chat/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          toUserSlug: recipientInfo.slug,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewMessage("");
        // Mesajul va fi adăugat prin SSE și va face scroll automat
        shouldScrollToBottom.current = true;
        if (!recipientOnline && recipientInfo?.email) {
          fetch("/api/chat/notify-offline-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: recipientInfo.email,
              fromName: recipientInfo.name,
              messageText: newMessage.trim(),
              conversationUrl: window.location.href,
            }),
          });
        }
      } else {
        console.error("Error sending message:", data.error);
        alert("Eroare la trimiterea mesajului: " + data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Eroare la trimiterea mesajului");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Astăzi";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ieri";
    } else {
      return date.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
      });
    }
  };

  // Grupează mesajele pe zile
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const dateKey = new Date(message.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  };

  // Determină dacă un mesaj este de la utilizatorul curent
  const isMessageFromCurrentUser = (message: Message): boolean => {
    // Folosește câmpul isFromCurrentUser din API dacă este disponibil
    if (typeof message.isFromCurrentUser === "boolean") {
      return message.isFromCurrentUser;
    }

    // Fallback pentru mesaje vechi - încearcă să compare slug-urile mai întâi
    if (message.fromUserSlug && currentUserSlug) {
      return message.fromUserSlug === currentUserSlug;
    }
    // Fallback pentru mesaje vechi fără slug
    return message.fromUsername === session?.user?.name;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {t("userConversations.loadingConversation")}
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-blue-500 text-6xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            {t("auth.requiredTitle")}
          </h1>
          <p className="text-gray-600 mb-4">{t("auth.requiredDescription")}</p>
          <button
            onClick={() => router.push("/api/auth/signin")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("auth.loginButton")}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            {t("common.error")}
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="w-full lg:max-w-4xl mx-auto flex flex-col"
        style={{ height: "90vh" }}
      >
        {/* Header */}
        <div className="bg-white shadow-sm p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                  {recipientInfo?.image ? (
                    <img
                      src={recipientInfo.image}
                      alt={recipientInfo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-blue-600 font-semibold">
                      {recipientInfo?.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="font-semibold text-gray-800">
                    {recipientInfo?.name}
                  </h1>
                  <div className="flex items-center space-x-1">
                    <Circle
                      size={8}
                      className={`${
                        recipientOnline
                          ? "text-green-500 fill-current"
                          : "text-gray-400"
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {recipientOnline
                        ? t("userConversations.online")
                        : t("userConversations.offline")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                {isConnected
                  ? t("userConversations.connected")
                  : t("userConversations.disconnected")}
              </span>
              {messages.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {messages.length} {t("userConversations.messagesCount")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div
          className="flex-1 bg-white overflow-hidden"
          style={{ maxHeight: "70vh" }}
        >
          <div
            ref={chatContainerRef}
            className="h-full overflow-y-auto p-4"
            style={{ height: "70vh" }}
          >
            {/* Load More Button - Afișat la începutul conversației */}
            {hasMoreMessages && messages.length > 0 && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingOlderMessages}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loadingOlderMessages ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>{t("userConversations.loadingOlderMessages")}</span>
                    </>
                  ) : (
                    <span>
                      {t("userConversations.loadOlderMessages", {
                        count: messagesOffset,
                      })}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Loading State for Initial Messages */}
            {messagesLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">
                    {t("userConversations.loadingMessages")}
                  </p>
                </div>
              </div>
            ) : Object.keys(messageGroups).length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <p className="text-lg font-medium mb-2">
                  {t("userConversations.newConversation")}
                </p>
                <p>
                  {t("userConversations.sendFirstMessage", {
                    name: recipientInfo?.name,
                  })}
                </p>
              </div>
            ) : (
              Object.entries(messageGroups).map(([dateKey, dayMessages]) => (
                <div key={dateKey} className="mb-6">
                  {/* Date Separator */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-gray-100 px-3 py-1 rounded-full">
                      <span className="text-xs text-gray-600 font-medium">
                        {formatDate(dayMessages[0].createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Messages for this day */}
                  <div className="space-y-3">
                    {dayMessages.map((message) => {
                      const isFromCurrentUser =
                        isMessageFromCurrentUser(message);

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isFromCurrentUser ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isFromCurrentUser
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            <p className="text-sm break-words mb-1">
                              {message.content}
                            </p>
                            <span className="text-xs opacity-75">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-4 bg-white">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Trimite un mesaj către ${recipientInfo?.name}...`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isConnected}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!isConnected || !newMessage.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
