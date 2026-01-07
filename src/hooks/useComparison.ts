import { useCallback } from 'react';
import { useComparisonStore } from '@/stores/comparison-store';
import type { Property } from '@/types/database';
import { toast } from 'sonner';

export function useComparison() {
  const {
    selectedProperties,
    addProperty,
    removeProperty,
    clearComparison,
    isSelected,
    canAddMore,
    maxProperties,
  } = useComparisonStore();

  const handleAddProperty = useCallback(
    (property: Property) => {
      if (!canAddMore()) {
        toast.error(`Solo puedes comparar hasta ${maxProperties} propiedades`);
        return false;
      }

      const added = addProperty(property);
      if (added) {
        toast.success('Propiedad agregada a la comparación');
      } else {
        toast.error('Esta propiedad ya está en la comparación');
      }

      return added;
    },
    [addProperty, canAddMore, maxProperties]
  );

  const handleRemoveProperty = useCallback(
    (propertyId: string) => {
      removeProperty(propertyId);
      toast.success('Propiedad removida de la comparación');
    },
    [removeProperty]
  );

  const handleClearComparison = useCallback(() => {
    clearComparison();
    toast.success('Comparación limpiada');
  }, [clearComparison]);

  const handleToggleProperty = useCallback(
    (property: Property) => {
      if (isSelected(property.id)) {
        handleRemoveProperty(property.id);
      } else {
        handleAddProperty(property);
      }
    },
    [isSelected, handleAddProperty, handleRemoveProperty]
  );

  return {
    selectedProperties,
    count: selectedProperties.length,
    maxProperties,
    canAddMore: canAddMore(),
    isSelected,
    addProperty: handleAddProperty,
    removeProperty: handleRemoveProperty,
    clearComparison: handleClearComparison,
    toggleProperty: handleToggleProperty,
  };
}


