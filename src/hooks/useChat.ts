import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import type { Property } from '@/types/database';

export function useChat() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const createConversationMutation = useMutation({
    mutationFn: async (property: Property) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para contactar');
      }

      if (!property.owner_id) {
        throw new Error('Propiedad sin propietario');
      }

      // User cannot contact themselves
      if (user.id === property.owner_id) {
        throw new Error('No puedes contactarte a ti mismo');
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.id,
          buyer_id: user.id,
          seller_id: property.owner_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear conversación');
      }

      return response.json();
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/messages?conversation=${conversation.id}`);
      toast.success('Conversación iniciada');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const startConversation = (property: Property) => {
    if (!user) {
      router.push('/auth/login');
      toast.info('Inicia sesión para contactar al vendedor');
      return;
    }

    createConversationMutation.mutate(property);
  };

  return {
    startConversation,
    isCreating: createConversationMutation.isPending,
  };
}

