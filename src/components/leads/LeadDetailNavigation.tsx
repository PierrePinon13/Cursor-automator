
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
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 font-medium">
        {currentIndex + 1} / {totalLeads}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="h-8 w-8 p-0 border-slate-300 hover:bg-slate-100 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
          className="h-8 w-8 p-0 border-slate-300 hover:bg-slate-100 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default LeadDetailNavigation;
