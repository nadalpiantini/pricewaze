'use client';

import { getSignalIcon } from '@/lib/signals';
import { formatPrice } from '@/config/market';

interface OfferEvent {
  id: string;
  event_type: string;
  amount?: number;
  created_at: string;
  signal_snapshot?: Record<string, { strength: number; confirmed: boolean }>;
}

interface OfferTimelineProps {
  events: OfferEvent[];
  className?: string;
}

function labelForEvent(type: string): string {
  const labels: Record<string, string> = {
    offer_created: 'Oferta creada',
    offer_sent: 'Oferta enviada',
    counteroffer: 'Contraoferta',
    accepted: 'Oferta aceptada',
    rejected: 'Oferta rechazada',
    withdrawn: 'Oferta retirada',
    expired: 'Oferta expirada',
  };
  return labels[type] || type;
}

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    offer_created: 'bg-gray-500',
    offer_sent: 'bg-blue-500',
    counteroffer: 'bg-orange-500',
    accepted: 'bg-green-500',
    rejected: 'bg-red-500',
    withdrawn: 'bg-gray-400',
    expired: 'bg-gray-300',
  };
  return colors[type] || 'bg-gray-500';
}

export function OfferTimeline({ events, className = '' }: OfferTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No hay eventos en esta negociación aún.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {events.map((event, index) => {
        const date = new Date(event.created_at);
        const formattedDate = date.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const formattedTime = date.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const signalSnapshot = event.signal_snapshot || {};
        const hasSignals = Object.keys(signalSnapshot).length > 0;

        return (
          <div key={event.id} className="relative pl-6 pb-4">
            {/* Timeline line */}
            {index < events.length - 1 && (
              <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-1 w-4 h-4 rounded-full ${getEventColor(
                event.event_type
              )} border-2 border-white shadow-sm`}
            />

            {/* Event content */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {labelForEvent(event.event_type)}
                </span>
                {event.amount && (
                  <span className="text-sm font-semibold text-gray-700">
                    {formatPrice(Number(event.amount))}
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500">
                {formattedDate} a las {formattedTime}
              </div>

              {/* Signal snapshot */}
              {hasSignals && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {Object.entries(signalSnapshot).map(([signalType, data]) => {
                    const roundedStrength = Math.round(data.strength);
                    if (roundedStrength === 0) return null;

                    return (
                      <span
                        key={signalType}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700"
                        title={`${signalType} (fuerza: ${roundedStrength})`}
                      >
                        <span>{getSignalIcon(signalType)}</span>
                        <span>{roundedStrength > 1 ? `×${roundedStrength}` : ''}</span>
                        {data.confirmed && (
                          <span className="text-green-600" title="Confirmado">✓</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

