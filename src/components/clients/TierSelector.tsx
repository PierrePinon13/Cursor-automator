
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TierSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function TierSelector({ value, onChange, disabled = false }: TierSelectorProps) {
  const [localValue, setLocalValue] = useState(value);
  const tiers = ['1', '2', '3'];

  // Synchroniser avec la valeur externe
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleTierClick = async (tier: string) => {
    if (disabled) return;
    
    const newValue = localValue === `Tier ${tier}` ? null : `Tier ${tier}`;
    
    // Mise à jour immédiate de l'état local pour l'UI
    setLocalValue(newValue);
    
    // Appel de la fonction de mise à jour
    try {
      await onChange(newValue);
    } catch (error) {
      // En cas d'erreur, revenir à l'ancienne valeur
      setLocalValue(value);
    }
  };

  return (
    <div className="flex gap-1">
      {tiers.map((tier) => {
        const isSelected = localValue === `Tier ${tier}`;
        return (
          <Button
            key={tier}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => handleTierClick(tier)}
            className={cn(
              "h-8 w-8 p-0 rounded-full border-2 font-medium transition-all duration-200",
              isSelected
                ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600 transform scale-105 shadow-md"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm"
            )}
          >
            {tier}
          </Button>
        );
      })}
    </div>
  );
}
