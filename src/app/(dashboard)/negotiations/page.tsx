'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowRight, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useChat } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

async function fetchConversations() {
  const response = await fetch('/api/conversations');
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return response.json();
}

export default function NegotiationsPage() {
  const { user } = useAuthStore();
  const { startConversation, isCreating } = useChat();

  const { data: conversationsData, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  const activeConversations = conversationsData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Negotiations</h1>
        <p className="text-muted-foreground">
          Manage your property negotiations and conversations
        </p>
      </div>

      {/* Conversations List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-muted animate-pulse rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeConversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No active negotiations</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start a conversation with a property owner or buyer to begin negotiations.
            </p>
            <Button asChild>
              <Link href="/properties">
                <Building2 className="h-4 w-4 mr-2" />
                Browse Properties
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeConversations.map((conversation: any) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/messages?conversation=${conversation.id}`}
                      className="font-semibold hover:underline"
                    >
                      {conversation.property?.title || 'Property Conversation'}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {conversation.buyer_id === user?.id
                        ? `With: ${conversation.seller?.full_name || 'Seller'}`
                        : `With: ${conversation.buyer?.full_name || 'Buyer'}`}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/messages?conversation=${conversation.id}`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open Chat
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

