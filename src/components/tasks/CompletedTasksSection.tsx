
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReminders } from '@/hooks/useReminders';
import { Badge } from '@/components/ui/badge';

export const CompletedTasksSection = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { reminders } = useReminders();

  const completedTasks = reminders.filter(reminder => reminder.read);

  return (
    <div className="bg-white rounded-lg shadow">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">Tâches réalisées</span>
          <Badge variant="secondary">{completedTasks.length}</Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t">
          {completedTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune tâche réalisée</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {completedTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg opacity-75">
                  <div className="p-0 h-6 w-6 flex-shrink-0 mt-0.5 flex items-center justify-center">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-600"></div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-700 line-through">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{task.message}</p>
                        
                        {task.lead_data && (
                          <div className="mt-2 text-xs text-gray-400">
                            Lead: {task.lead_data.author_name}
                            {task.lead_data.company_position && (
                              <span> - {task.lead_data.company_position}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <Badge variant="outline" className="text-xs opacity-50">
                        Terminé
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
