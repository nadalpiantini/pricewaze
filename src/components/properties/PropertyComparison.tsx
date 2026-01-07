'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComparisonTable } from './ComparisonTable';
import { PropertyCard } from './PropertyCard';
import { useComparison } from '@/hooks/useComparison';
import { X, Download, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { exportComparisonToPDF } from '@/lib/pdf/exportComparison';

export function PropertyComparison() {
  const { selectedProperties, clearComparison, removeProperty, count } = useComparison();
  const router = useRouter();

  const handleExportPDF = async () => {
    if (selectedProperties.length === 0) return;
    await exportComparisonToPDF(selectedProperties);
  };

  const handleClear = () => {
    clearComparison();
  };

  if (selectedProperties.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg text-gray-600 mb-2">No hay propiedades seleccionadas</p>
          <p className="text-sm text-gray-500 mb-4">
            Agrega propiedades desde las tarjetas para compararlas
          </p>
          <Button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700"
          >
            Explorar Propiedades
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl bg-gradient-to-r from-cyan-700 to-emerald-600 bg-clip-text text-transparent">
                Comparación de Propiedades
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {count} de 3 propiedades seleccionadas
              </p>
            </div>
            <div className="flex gap-2">
              {selectedProperties.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleClear}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpiar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedProperties.map((property) => (
          <div key={property.id} className="relative">
            <PropertyCard property={property} />
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md hover:bg-red-50 hover:text-red-600 z-10"
              onClick={() => removeProperty(property.id)}
              title="Remover de comparación"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: 3 - selectedProperties.length }).map((_, index) => (
          <Card
            key={`empty-${index}`}
            className="border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[400px]"
          >
            <CardContent className="text-center text-gray-400">
              <p className="text-sm">Agregar propiedad</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla Comparativa</CardTitle>
        </CardHeader>
        <CardContent>
          <ComparisonTable properties={selectedProperties} />
        </CardContent>
      </Card>
    </div>
  );
}


