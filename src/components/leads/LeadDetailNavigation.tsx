
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LeadDetailNavigationProps {
  currentIndex: number;
  totalLeads: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

const LeadDetailNavigation = ({
  currentIndex,
  totalLeads,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext
}: LeadDetailNavigationProps) => {
  return (
    <div className="flex items-center justify-end">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">
          {currentIndex + 1}/{totalLeads}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default LeadDetailNavigation;
