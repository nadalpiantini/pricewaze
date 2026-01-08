'use client';

import { CopilotAlertsFeed } from './CopilotAlertsFeed';

interface OfferCopilotPanelProps {
  offerId: string;
  propertyId?: string;
  className?: string;
}

/**
 * Panel del Copilot para vista de oferta/negociación
 * Pantalla 4 del documento: Negociación asistida
 */
export function OfferCopilotPanel({
  offerId,
  propertyId,
  className,
}: OfferCopilotPanelProps) {
  return (
    <div className={className}>
      <CopilotAlertsFeed
        offerId={offerId}
        propertyId={propertyId}
        showHeader={true}
        maxAlerts={5}
      />
    </div>
  );
}

