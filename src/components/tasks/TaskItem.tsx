
import { useState } from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Reminder } from '@/hooks/useReminders';

interface TaskItemProps {
  task: Reminder;
  onComplete: (taskId: string) => void;
}

export const TaskItem = ({ task, onComplete }: TaskItemProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    setShowAnimation(true);
    
    // Animation duration
    setTimeout(async () => {
      await onComplete(task.id);
      setIsCompleting(false);
      setShowAnimation(false);
    }, 800);
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
      <Button
        variant="ghost"
        size="sm"
        className="p-0 h-6 w-6 flex-shrink-0 mt-0.5"
        onClick={handleComplete}
        disabled={isCompleting}
      >
        {showAnimation ? (
          <CheckCircle2 className="h-5 w-5 text-blue-600 animate-scale-in" />
        ) : (
          <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600 transition-colors" />
        )}
      </Button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{task.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{task.message}</p>
            
            {task.lead_data && (
              <div className="mt-2 text-xs text-gray-500">
                Lead: {task.lead_data.author_name}
                {task.lead_data.company_position && (
                  <span> - {task.lead_data.company_position}</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-xs">
              {task.type}
            </Badge>
            
            {task.due_date && (
              <span className="text-xs text-gray-500">
                Échéance: {new Date(task.due_date).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
