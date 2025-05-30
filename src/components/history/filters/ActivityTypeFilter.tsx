
import React from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityTypeFilterProps {
  activityTypes: string[];
  onActivityTypesChange: (types: string[]) => void;
}

const ActivityTypeFilter = ({ activityTypes, onActivityTypesChange }: ActivityTypeFilterProps) => {
  const handleActivityTypeToggle = (type: string) => {
    if (activityTypes.includes(type)) {
      onActivityTypesChange(activityTypes.filter(t => t !== type));
    } else {
      onActivityTypesChange([...activityTypes, type]);
    }
  };

  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleActivityTypeToggle('linkedin_message')}
        className={cn(
          'h-6 px-2 border text-xs rounded-r-none border-r-0',
          activityTypes.includes('linkedin_message')
            ? 'bg-blue-100 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-600'
        )}
      >
        <Linkedin className={cn(
          'h-3 w-3',
          activityTypes.includes('linkedin_message') ? 'text-blue-700' : 'text-gray-400'
        )} />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleActivityTypeToggle('phone_call')}
        className={cn(
          'h-6 px-2 border text-xs rounded-l-none',
          activityTypes.includes('phone_call')
            ? 'bg-green-100 border-green-300 text-green-700'
            : 'bg-white border-gray-300 text-gray-600'
        )}
      >
        <Phone className={cn(
          'h-3 w-3',
          activityTypes.includes('phone_call') ? 'text-green-700' : 'text-gray-400'
        )} />
      </Button>
    </div>
  );
};

export default ActivityTypeFilter;
