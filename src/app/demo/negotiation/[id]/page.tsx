import { DemoNegotiationView } from '@/components/demo/DemoNegotiationView';
import { Metadata } from 'next';
import { getDemoProperty } from '@/lib/demo-data';

interface DemoNegotiationPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DemoNegotiationPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = getDemoProperty(id);
  
  if (!property) {
    return {
      title: 'Negociación no encontrada | PriceWaze',
    };
  }

  return {
    title: `Negociación: ${property.title} | PriceWaze Demo`,
    description: `Explora el timeline de negociación y análisis del copiloto de IA para ${property.title}.`,
  };
}

export default async function DemoNegotiationPage({ params }: DemoNegotiationPageProps) {
  const { id } = await params;
  return <DemoNegotiationView propertyId={id} />;
}

