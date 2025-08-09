// components/UserConversations.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, Clock, User } from 'lucide-react';
import { createConversationUrl } from '@/utils/userResolver';

interface ConversationPreview {
  participantName: string;
  participantEmail?: string;
  participantImage?: string;
  lastMessage?: {
    id: string;
    content: string;
    fromUsername: string;
    createdAt: string;
  };
  messageCount: number;
  unreadCount?: number;
}

interface UserConversationsProps {
  className?: string;
}

const UserConversations: React.FC<UserConversationsProps> = ({ className = "" }) => {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const currentUserName = session?.user?.name;

  useEffect(() => {
    if (currentUserName) {
      fetchConversations();
    }
  }, [currentUserName]);

  const fetchConversations = async () => {
    if (!currentUserName) return;

    try {
      setLoading(true);
      const response = await fetch('/api/chat/conversations', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations);
        console.log("data conversations:", data.conversations);
      } else {
        setError(data.error || 'Nu s-au putut încărca conversațiile');
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Eroare la încărcarea conversațiilor');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ro-RO', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return t('userConversations.yesterday');
    } else if (diffDays < 7) {
      return t('userConversations.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString('ro-RO', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const getConversationUrl = (participantName: string) => {
    // Folosește helper-ul pentru a crea URL-ul corect
    return createConversationUrl(participantName);
  };

  const truncateMessage = (content: string, maxLength: number = 60) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">{t('userConversations.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('userConversations.error')}</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchConversations}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('userConversations.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('userConversations.noConversations')}</h3>
          <p className="text-gray-600 mb-4">
            {t('userConversations.noConversationsInfo')}
          </p>
          <p className="text-sm text-gray-500">
            {t('userConversations.visitProfileToStart')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            {t('userConversations.title')} ({conversations.length>0 && conversations.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-100">
          {conversations.map((conversation, index) => {
            const isFromCurrentUser = conversation.lastMessage?.fromUsername === currentUserName;
            
            return (
              <Link
                key={`${conversation.participantName}-${index}`}
                href={getConversationUrl(conversation.participantName)}
                className="block hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="p-4">
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {conversation.participantImage ? (
                        <div className="relative w-12 h-12">
                          <Image
                            src={conversation.participantImage}
                            alt={conversation.participantName}
                            fill
                            className="rounded-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {conversation.participantName}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                          {conversation.unreadCount && conversation.unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {conversation.lastMessage ? (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            <span className="font-medium">
                              {isFromCurrentUser ? t('userConversations.you') + ': ' : ''}
                            </span>
                            {truncateMessage(conversation.lastMessage.content)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          {t('userConversations.noMessagesYet')}
                        </p>
                      )}

                      <div className="mt-1 flex items-center text-xs text-gray-500">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {conversation.messageCount} {conversation.messageCount === 1 ? t('userConversations.message') : t('userConversations.messages')}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Refresh button */}
      <div className="mt-4 text-center">
        <button
          onClick={fetchConversations}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          {loading ? t('userConversations.refreshing') : t('userConversations.refresh')}
        </button>
      </div>
    </div>
  );
};

export default UserConversations;