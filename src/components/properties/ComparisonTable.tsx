'use client';

import { Badge } from '@/components/ui/badge';
import { Bed, Bath, Maximize, MapPin } from 'lucide-react';
import type { Property } from '@/types/database';
import { formatPrice } from '@/lib/utils';

interface ComparisonTableProps {
  properties: Property[];
}

const propertyTypeLabels: Record<Property['property_type'], string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  office: 'Office',
};

export function ComparisonTable({ properties }: ComparisonTableProps) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No hay propiedades para comparar</p>
        <p className="text-sm mt-2">Agrega propiedades desde las tarjetas para compararlas</p>
      </div>
    );
  }

  const rows = [
    {
      label: 'Precio',
      getValue: (p: Property) => formatPrice(p.price),
    },
    {
      label: 'Precio por m²',
      getValue: (p: Property) => `$${p.price_per_m2.toLocaleString()}/m²`,
    },
    {
      label: 'Tipo',
      getValue: (p: Property) => propertyTypeLabels[p.property_type],
    },
    {
      label: 'Área',
      getValue: (p: Property) => `${p.area_m2} m²`,
    },
    {
      label: 'Habitaciones',
      getValue: (p: Property) => p.bedrooms?.toString() || 'N/A',
    },
    {
      label: 'Baños',
      getValue: (p: Property) => p.bathrooms?.toString() || 'N/A',
    },
    {
      label: 'Estacionamientos',
      getValue: (p: Property) => p.parking_spaces?.toString() || 'N/A',
    },
    {
      label: 'Año de construcción',
      getValue: (p: Property) => p.year_built?.toString() || 'N/A',
    },
    {
      label: 'Zona',
      getValue: (p: Property) => p.zone?.name || 'N/A',
    },
    {
      label: 'Dirección',
      getValue: (p: Property) => p.address,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-4 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10">
              Característica
            </th>
            {properties.map((property, index) => (
              <th
                key={property.id}
                className="text-center p-4 font-semibold text-gray-700 bg-gray-50 min-w-[200px]"
              >
                <div className="space-y-2">
                  <p className="text-lg font-bold bg-gradient-to-r from-cyan-700 to-emerald-600 bg-clip-text text-transparent">
                    {formatPrice(property.price)}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">{property.title}</p>
                  <Badge className="bg-gradient-to-r from-cyan-600 to-emerald-600 text-white">
                    {propertyTypeLabels[property.property_type]}
                  </Badge>
                </div>
              </th>
            ))}
            {/* Empty cells for remaining slots */}
            {Array.from({ length: 3 - properties.length }).map((_, index) => (
              <th
                key={`empty-${index}`}
                className="text-center p-4 font-semibold text-gray-400 bg-gray-50 min-w-[200px] border-2 border-dashed border-gray-300"
              >
                <p className="text-sm">Agregar propiedad</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.label}
              className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="p-4 font-medium text-gray-700 sticky left-0 z-10 bg-inherit border-r border-gray-200">
                {row.label}
              </td>
              {properties.map((property) => (
                <td key={property.id} className="p-4 text-center text-gray-600">
                  {row.getValue(property)}
                </td>
              ))}
              {Array.from({ length: 3 - properties.length }).map((_, index) => (
                <td
                  key={`empty-${index}`}
                  className="p-4 text-center text-gray-400 border-2 border-dashed border-gray-300"
                >
                  —
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


