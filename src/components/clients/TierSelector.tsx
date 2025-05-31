
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TierSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function TierSelector({ value, onChange, disabled = false }: TierSelectorProps) {
  const tiers = ['1', '2', '3'];

  const handleTierClick = (tier: string) => {
    if (disabled) return;
    
    // Si le tier est déjà sélectionné, on le désélectionne
    if (value === `Tier ${tier}`) {
      onChange(null);
    } else {
      onChange(`Tier ${tier}`);
    }
  };

  return (
    <div className="flex gap-1">
      {tiers.map((tier) => {
        const isSelected = value === `Tier ${tier}`;
        return (
          <Button
            key={tier}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => handleTierClick(tier)}
            className={cn(
              "h-8 w-8 p-0 rounded-full border-2 font-medium transition-all",
              isSelected
                ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:text-blue-600"
            )}
          >
            {tier}
          </Button>
        );
      })}
    </div>
  );
}
