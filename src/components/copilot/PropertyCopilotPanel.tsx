'use client';

import { useEffect } from 'react';
import { CopilotAlertsFeed } from './CopilotAlertsFeed';
import { useCopilotAlerts } from '@/hooks/useCopilotAlerts';
import { Card, CardContent } from '@/components/ui/card';

interface PropertyCopilotPanelProps {
  propertyId: string;
  className?: string;
}

/**
 * Panel del Copilot para vista de propiedad
 * Pantalla 2 del documento: Historia de Precio + Alertas
 */
export function PropertyCopilotPanel({
  propertyId,
  className,
}: PropertyCopilotPanelProps) {
  const { trackView } = useCopilotAlerts({ propertyId, autoFetch: false });

  // Track view cuando se monta el componente
  useEffect(() => {
    if (propertyId) {
      trackView(propertyId).catch(console.error);
    }
  }, [propertyId, trackView]);

  return (
    <div className={className}>
      <CopilotAlertsFeed
        propertyId={propertyId}
        showHeader={true}
        maxAlerts={3}
      />
    </div>
  );
}

