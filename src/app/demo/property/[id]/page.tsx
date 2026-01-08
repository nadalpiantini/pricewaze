import { DemoPropertyView } from '@/components/demo/DemoPropertyView';
import { Metadata } from 'next';
import { getDemoProperty } from '@/lib/demo-data';

interface DemoPropertyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DemoPropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = getDemoProperty(id);
  
  if (!property) {
    return {
      title: 'Propiedad no encontrada | PriceWaze',
    };
  }

  return {
    title: `${property.title} | PriceWaze Demo`,
    description: property.description || `Explora ${property.title} con señales del mercado en tiempo real.`,
  };
}

export default async function DemoPropertyPage({ params }: DemoPropertyPageProps) {
  const { id } = await params;
  return <DemoPropertyView propertyId={id} />;
}

