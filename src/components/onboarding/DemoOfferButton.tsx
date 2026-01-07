'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Zap, Loader2 } from 'lucide-react';
import type { Property } from '@/types/database';

interface DemoOfferButtonProps {
  property: Property;
  onOfferCreated?: () => void;
}

// I.2 Demo data: Botón para crear oferta de prueba
export function DemoOfferButton({ property, onOfferCreated }: DemoOfferButtonProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      setAmount(formatCurrency(parseInt(value)));
    } else {
      setAmount('');
    }
  };

  const handleCreateDemoOffer = async () => {
    const offerAmount = parseCurrency(amount);
    if (offerAmount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setLoading(true);

    try {
      // En producción, esto llamaría a la API real
      // Por ahora, simulamos la creación
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success('Oferta de prueba creada', {
        description: `Tu oferta de ${formatCurrency(offerAmount)} será analizada por el copiloto.`,
      });

      onOfferCreated?.();
    } catch (error) {
      toast.error('Error al crear oferta de prueba');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const suggestedAmounts = [
    { label: '-10%', value: property.price * 0.9 },
    { label: 'Precio completo', value: property.price },
    { label: '+5%', value: property.price * 1.05 },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="demo-amount">Monto de la oferta</Label>
        <div className="flex gap-2">
          <Input
            id="demo-amount"
            type="text"
            placeholder="$0"
            value={amount}
            onChange={handleAmountChange}
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={handleCreateDemoOffer}
            disabled={loading || parseCurrency(amount) <= 0}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Crear oferta de prueba
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {suggestedAmounts.map((suggestion) => (
          <Button
            key={suggestion.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAmount(formatCurrency(suggestion.value))}
            disabled={loading}
          >
            {suggestion.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

