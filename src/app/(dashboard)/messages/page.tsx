'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useAuthStore } from '@/stores/auth-store';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Conversation } from '@/types/database';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json() as Promise<Conversation[]>;
    },
  });

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Inicia sesión para ver tus mensajes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mensajes</h1>
        <p className="text-muted-foreground mt-2">
          Conversaciones sobre propiedades
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : conversations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No hay conversaciones</p>
                <p className="text-sm text-muted-foreground">
                  Inicia una conversación desde una propiedad
                </p>
              </CardContent>
            </Card>
          ) : (
            conversations.map((conversation) => {
              const otherUser =
                conversation.buyer_id === user.id ? conversation.seller : conversation.buyer;
              const isSelected = conversation.id === selectedConversationId;

              return (
                <Card
                  key={conversation.id}
                  className={`cursor-pointer hover:bg-muted transition-colors ${
                    isSelected ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={otherUser?.avatar_url || undefined} />
                        <AvatarFallback>
                          {otherUser?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold truncate">
                            {otherUser?.full_name || 'Usuario'}
                          </p>
                          {conversation.unread_count && conversation.unread_count > 0 && (
                            <Badge variant="default" className="ml-2">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conversation.property && (
                          <p className="text-sm text-muted-foreground truncate mb-1">
                            {conversation.property.title}
                          </p>
                        )}
                        {conversation.last_message_at && (
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.last_message_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          {selectedConversationId && user ? (
            <ChatWindow conversationId={selectedConversationId} currentUserId={user.id} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Selecciona una conversación</p>
                <p className="text-sm text-muted-foreground">
                  Elige una conversación de la lista para ver los mensajes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

