import { DemoMap } from '@/components/demo/DemoMap';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explora el Mercado Inmobiliario | PriceWaze',
  description: 'Descubre propiedades con señales en tiempo real del mercado. Explora el mapa interactivo y entiende qué está pasando en el mercado inmobiliario.',
};

export default function DemoMapPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">The market in real time</h1>
          <p className="text-muted-foreground">
            No estimates. Live signals from real buyers.
          </p>
        </div>
        <DemoMap />
      </div>
    </div>
  );
}

