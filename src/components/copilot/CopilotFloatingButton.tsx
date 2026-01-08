'use client';

import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopilotAlertsFeed } from './CopilotAlertsFeed';
import { cn } from '@/lib/utils';

interface CopilotFloatingButtonProps {
  propertyId?: string;
  offerId?: string;
  className?: string;
}

/**
 * Botón flotante del Copilot
 * Punto de entrada único según el documento del Copilot v1
 */
export function CopilotFloatingButton({
  propertyId,
  offerId,
  className,
}: CopilotFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!propertyId && !offerId) {
    return null;
  }

  return (
    <>
      {/* Botón flotante */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
          'bg-primary hover:bg-primary/90',
          'transition-all duration-200',
          isOpen && 'rotate-180',
          className
        )}
        size="icon"
        aria-label="Abrir Copilot"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
      </Button>

      {/* Panel del Copilot */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] overflow-y-auto">
          <CopilotAlertsFeed
            propertyId={propertyId}
            offerId={offerId}
            showHeader={true}
            maxAlerts={10}
          />
        </div>
      )}
    </>
  );
}

