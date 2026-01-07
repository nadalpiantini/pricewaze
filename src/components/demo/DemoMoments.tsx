'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

// I.4 Momentos demo: Componentes observables para ventas/prensa
// "Mira cómo cambia el pin", "Mira cómo el copiloto explica", "Mira cómo expira la oferta"

interface DemoMoment {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

interface DemoMomentsProps {
  moments: DemoMoment[];
}

export function DemoMoments({ moments }: DemoMomentsProps) {
  const [currentMoment, setCurrentMoment] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    // Auto-advance through moments
    const interval = setInterval(() => {
      setCurrentMoment((prev) => {
        if (prev >= moments.length - 1) {
          clearInterval(interval);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    // Cleanup on unmount or stop
    return () => clearInterval(interval);
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentMoment(0);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Momentos Demo</h3>
          <p className="text-sm text-muted-foreground">
            Observa cómo funciona PriceWaze en acción
          </p>
        </div>
        <div className="flex gap-2">
          {!isPlaying ? (
            <Button onClick={handlePlay} size="sm" className="gap-2">
              <Play className="w-4 h-4" />
              Reproducir
            </Button>
          ) : (
            <Button onClick={handleStop} size="sm" variant="outline" className="gap-2">
              <Pause className="w-4 h-4" />
              Pausar
            </Button>
          )}
          <Button onClick={handleReset} size="sm" variant="ghost" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">{moments[currentMoment]?.title}</h4>
            <p className="text-sm text-muted-foreground">
              {moments[currentMoment]?.description}
            </p>
          </div>
          <div className="min-h-[200px] flex items-center justify-center border rounded-lg bg-muted/50">
            {moments[currentMoment]?.component}
          </div>
        </div>
      </Card>

      <div className="flex gap-2 justify-center">
        {moments.map((moment, idx) => (
          <button
            key={moment.id}
            onClick={() => setCurrentMoment(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === currentMoment
                ? 'w-8 bg-primary'
                : 'w-2 bg-muted hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to ${moment.title}`}
          />
        ))}
      </div>
    </div>
  );
}

