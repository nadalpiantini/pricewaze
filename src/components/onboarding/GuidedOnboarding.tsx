'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Heart, Zap, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { PropertyMapWithSignals } from '@/components/map/PropertyMapWithSignals';
import type { Property } from '@/types/database';
import { DemoOfferButton } from './DemoOfferButton';

// I.1 ONBOARDING GUIADO (3 pasos)
// Paso 1: Explora (mapa con pins vivos)
// Paso 2: Sigue (CTA + explicación de alertas)
// Paso 3: Simula (botón "Crear oferta de prueba")

interface GuidedOnboardingProps {
  demoProperties: Property[];
  onComplete?: () => void;
}

export function GuidedOnboarding({ demoProperties, onComplete }: GuidedOnboardingProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [followedProperty, setFollowedProperty] = useState<Property | null>(null);

  const steps = [
    {
      id: 0,
      title: 'Explora el mapa',
      description: 'Esto es señal comunitaria. Los pins cambian de color según lo que reportan otros compradores.',
      component: Step1Explore,
    },
    {
      id: 1,
      title: 'Sigue una propiedad',
      description: 'Recibe alertas cuando cambia el precio, hay nuevas ofertas o se confirman señales.',
      component: Step2Follow,
    },
    {
      id: 2,
      title: 'Simula una oferta',
      description: 'Crea una oferta de prueba y ve cómo el copiloto analiza tu estrategia.',
      component: Step3Simulate,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      onComplete?.();
      router.push('/');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep]?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PriceWaze</span>
          </div>
          <div className="flex items-center gap-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-8 bg-primary'
                    : idx < currentStep
                    ? 'w-2 bg-primary/60'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20 pb-8 px-4 min-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl"
          >
            {CurrentStepComponent && (
              <CurrentStepComponent
                demoProperties={demoProperties}
                selectedProperty={selectedProperty}
                followedProperty={followedProperty}
                onSelectProperty={setSelectedProperty}
                onFollowProperty={setFollowedProperty}
                onNext={handleNext}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <div className="fixed bottom-4 left-0 right-0">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Atrás
          </Button>
          <span className="text-sm text-muted-foreground">
            Paso {currentStep + 1} de {steps.length}
          </span>
          <Button onClick={handleNext} className="gap-2">
            {currentStep === steps.length - 1 ? 'Comenzar' : 'Siguiente'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// PASO 1: Explora (mapa con pins vivos)
interface StepProps {
  demoProperties: Property[];
  selectedProperty: Property | null;
  followedProperty: Property | null;
  onSelectProperty: (property: Property | null) => void;
  onFollowProperty: (property: Property | null) => void;
  onNext: () => void;
}

function Step1Explore({
  demoProperties,
  selectedProperty,
  onSelectProperty,
  onNext,
}: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Explora el mapa</h2>
        <p className="text-muted-foreground">
          Los pins cambian de color según lo que reportan otros compradores
        </p>
      </div>

      <Card className="p-4">
        <div className="h-[400px] rounded-lg overflow-hidden">
          <PropertyMapWithSignals
            properties={demoProperties}
            onPropertyClick={(property) => {
              onSelectProperty(property);
            }}
            onMapClick={() => {}}
          />
        </div>
      </Card>

      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Esto es señal comunitaria</p>
            <p className="text-sm text-muted-foreground">
              Cada pin muestra información en tiempo real: ofertas activas, visitas recientes,
              señales confirmadas. Como Waze, pero para propiedades.
            </p>
          </div>
        </div>
      </Card>

      {selectedProperty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Card className="p-4 border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{selectedProperty.title}</p>
                <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
              </div>
              <Button onClick={onNext} size="sm">
                Continuar
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// PASO 2: Sigue (CTA + explicación de alertas)
function Step2Follow({
  demoProperties,
  followedProperty,
  onFollowProperty,
  onNext,
}: StepProps) {
  const handleFollow = async (property: Property) => {
    // Simular seguir propiedad (en producción, llamar a API)
    try {
      const response = await fetch('/api/properties/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: property.id }),
      });

      if (response.ok) {
        onFollowProperty(property);
      }
    } catch (error) {
      console.error('Error following property:', error);
      // En demo, simular éxito
      onFollowProperty(property);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Sigue una propiedad</h2>
        <p className="text-muted-foreground">
          Recibe alertas cuando cambia el precio, hay nuevas ofertas o se confirman señales
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Array.isArray(demoProperties) ? demoProperties : []).slice(0, 3).map((property) => {
          const isFollowed = followedProperty?.id === property.id;

          return (
            <Card
              key={property.id}
              className={`p-4 cursor-pointer transition-all ${
                isFollowed ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => !isFollowed && handleFollow(property)}
            >
              <div className="space-y-2">
                <h3 className="font-semibold">{property.title}</h3>
                <p className="text-sm text-muted-foreground">{property.address}</p>
                <p className="font-bold">${property.price.toLocaleString()}</p>
                {isFollowed && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Heart className="h-4 w-4 fill-current" />
                    <span>Siguiendo</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Alertas en 1 línea</p>
            <p className="text-sm text-muted-foreground">
              Te notificamos cuando: el precio baja, hay nuevas ofertas, se confirman señales
              negativas, o cambia el leverage de negociación.
            </p>
          </div>
        </div>
      </Card>

      {followedProperty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Button onClick={onNext} className="w-full" size="lg">
            Continuar
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// PASO 3: Simula (botón "Crear oferta de prueba")
function Step3Simulate({
  demoProperties,
  onNext,
}: StepProps) {
  const [demoProperty] = useState(demoProperties[0] || null);
  const [offerCreated, setOfferCreated] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Simula una oferta</h2>
        <p className="text-muted-foreground">
          Crea una oferta de prueba y ve cómo el copiloto analiza tu estrategia
        </p>
      </div>

      {demoProperty && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{demoProperty.title}</h3>
              <p className="text-sm text-muted-foreground">{demoProperty.address}</p>
              <p className="text-2xl font-bold mt-2">${demoProperty.price.toLocaleString()}</p>
            </div>

            <DemoOfferButton
              property={demoProperty}
              onOfferCreated={() => setOfferCreated(true)}
            />

            {offerCreated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-primary/10 rounded-lg"
              >
                <p className="text-sm font-semibold mb-2">✅ Oferta de prueba creada</p>
                <p className="text-xs text-muted-foreground">
                  El copiloto analizará tu oferta y te dará feedback sobre fairness score,
                  leverage de negociación y recomendaciones.
                </p>
              </motion.div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Meta: entender el valor antes de loguearse</p>
            <p className="text-sm text-muted-foreground">
              Cualquiera puede ver el sistema funcionando sin crear cuenta. Si entiendes el valor
              en 5 minutos, todo lo demás fluye.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

