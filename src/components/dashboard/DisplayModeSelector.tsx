
import { Button } from '@/components/ui/button';
import { Hash, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type DisplayMode = 'stats' | 'evolution';

interface DisplayModeSelectorProps {
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

export function DisplayModeSelector({ mode, onModeChange }: DisplayModeSelectorProps) {
  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 rounded-none border-r",
          mode === 'stats' ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
        )}
        onClick={() => onModeChange('stats')}
      >
        <Hash className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 rounded-none",
          mode === 'evolution' ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
        )}
        onClick={() => onModeChange('evolution')}
      >
        <TrendingUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
