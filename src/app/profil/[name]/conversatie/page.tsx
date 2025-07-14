'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Circle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  resolveRecipientName, 
  normalizeUserName, 
  generateConversationId 
} from '@/utils/userResolver';

interface Message {
  id: string;
  content: string;
  fromUsername: string;
  toUsername: string;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
}

export default function ConversatiePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Namnet din URL (formatat)
  const rawRecipientName = params.name as string;
  
  const [recipientName, setRecipientName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Obține numele utilizatorului curent din sesiunea NextAuth
  const currentUserName = session?.user?.name;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Rezolvă numele real al destinatarului
  useEffect(() => {
    const resolveRecipient = async () => {
      if (!rawRecipientName) {
        setError('Destinatar invalid');
        setLoading(false);
        return;
      }

      try {
        // Încearcă să obții lista de utilizatori pentru rezolvare precisă
        // Dacă nu e disponibilă, va folosi fallback-ul
        let users: { name: string; email: string }[] = [];
        
        try {
          // Încearcă să încarci utilizatorii dacă ai un endpoint pentru asta
          const response = await fetch('/api/users'); // endpoint opțional
          if (response.ok) {
            const data = await response.json();
            users = data.users || [];
          }
        } catch (error) {
          console.log('Could not load users list, using fallback');
        }

        const resolvedName = await resolveRecipientName(rawRecipientName, users);
        setRecipientName(resolvedName);
        setLoading(false);
      } catch (error) {
        console.error('Error resolving recipient name:', error);
        setError('Eroare la rezolvarea numelui destinatarului');
        setLoading(false);
      }
    };

    resolveRecipient();
  }, [rawRecipientName]);

  // Funcție pentru a încărca mesajele anterioare
  const loadPreviousMessages = async (currentUserName: string, recipientName: string) => {
    try {
      const response = await fetch(
        `/api/chat/conversation?user1=${encodeURIComponent(currentUserName)}&user2=${encodeURIComponent(recipientName)}&limit=50`
      );
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        console.error('Error loading messages:', data.error);
      }
    } catch (error) {
      console.error('Error loading previous messages:', error);
    }
  };

  // Funcție pentru a conecta la SSE
  const connectEventSource = (currentUserName: string, recipientName: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Generează conversationId folosind numele reale
    const conversationId = generateConversationId(currentUserName, recipientName);
    const eventSourceUrl = `/api/chat/conversation/events?user=${encodeURIComponent(currentUserName)}&conversation=${encodeURIComponent(conversationId)}`;
    const eventSource = new EventSource(eventSourceUrl);

    eventSource.onopen = () => {
      console.log('EventSource connected for conversation:', conversationId);
      setIsConnected(true);
      setError('');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            console.log('Connected to conversation');
            break;
          case 'message':
            // Verifică dacă mesajul aparține conversației curente
            if ((data.message.fromUsername === currentUserName && data.message.toUsername === recipientName) ||
                (data.message.fromUsername === recipientName && data.message.toUsername === currentUserName)) {
              setMessages(prev => [...prev, data.message]);
            }
            break;
          case 'userOnline':
            if (data.username === recipientName) {
              setRecipientOnline(true);
            }
            break;
          case 'userOffline':
            if (data.username === recipientName) {
              setRecipientOnline(false);
            }
            break;
          case 'heartbeat':
            // Heartbeat pentru a menține conexiunea
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing event data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setIsConnected(false);
      eventSource.close();
      
      // Încearcă să se reconecteze după 3 secunde
      setTimeout(() => {
        if (currentUserName && recipientName) {
          connectEventSource(currentUserName, recipientName);
        }
      }, 3000);
    };

    eventSourceRef.current = eventSource;
  };

  // Inițializare la mount - așteaptă rezolvarea numelui
  useEffect(() => {
    const initializeChat = async () => {
      // Verifică dacă încă se încarcă numele destinatarului
      if (loading) {
        return;
      }

      // Verifică status-ul de autentificare
      if (status === 'loading') {
        return; // Așteaptă să se încarce sesiunea
      }
      
      if (status === 'unauthenticated' || !session?.user?.name) {
        setError('Trebuie să te autentifici pentru a accesa conversația');
        return;
      }

      const currentUserName = session.user.name;
      
      // Verifică dacă numele destinatarului este valid
      if (!recipientName || recipientName.trim() === '') {
        setError('Destinatar invalid');
        return;
      }

      // Verifică să nu încerce să converseze cu sine
      if (normalizeUserName(currentUserName) === normalizeUserName(recipientName)) {
        setError('Nu poți conversa cu tine însuți');
        return;
      }

      // Încarcă mesajele și conectează-te la SSE folosind numele reale
      await loadPreviousMessages(currentUserName, recipientName);
      connectEventSource(currentUserName, recipientName);
    };

    initializeChat();

    // Cleanup la unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [recipientName, session, status, loading]);

  // Funcție pentru trimiterea mesajelor
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected || !currentUserName) return;

    try {
      const response = await fetch('/api/chat/conversation/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          fromUsername: currentUserName, // numele real
          toUsername: recipientName // numele real rezolvat
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
      } else {
        console.error('Error sending message:', data.error);
        alert('Eroare la trimiterea mesajului: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Eroare la trimiterea mesajului');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ro-RO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Astăzi';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ieri';
    } else {
      return date.toLocaleDateString('ro-RO', { 
        day: 'numeric', 
        month: 'long' 
      });
    }
  };

  // Grupează mesajele pe zile
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = new Date(message.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă conversația...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-blue-500 text-6xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Autentificare Necesară</h1>
          <p className="text-gray-600 mb-4">Trebuie să te autentifici pentru a accesa conversația.</p>
          <button
            onClick={() => router.push('/api/auth/signin')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Autentifică-te
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
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Eroare</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Înapoi
          </button>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full lg:max-w-4xl mx-auto h-screen flex flex-col">
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
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {recipientName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="font-semibold text-gray-800">{recipientName}</h1>
                  <div className="flex items-center space-x-1">
                    <Circle 
                      size={8} 
                      className={`${recipientOnline ? 'text-green-500 fill-current' : 'text-gray-400'}`} 
                    />
                    <span className="text-xs text-gray-500">
                      {recipientOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Conectat' : 'Deconectat'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-white overflow-hidden">
          <div 
            ref={chatContainerRef}
            className="h-full overflow-y-auto p-4"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
            {Object.keys(messageGroups).length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <p className="text-lg font-medium mb-2">Conversație nouă</p>
                <p>Trimite primul mesaj către {recipientName}!</p>
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
                      const isFromCurrentUser = message.fromUsername === currentUserName;
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isFromCurrentUser
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-800'
                            }`}
                          >
                            <p className="text-sm break-words mb-1">{message.content}</p>
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
                placeholder={`Trimite un mesaj către ${recipientName}...`}
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