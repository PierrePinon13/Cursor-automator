
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, Clock, UserCheck, Briefcase } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';

interface TasksPreviewProps {
  onViewAllTasks: () => void;
}

const TasksPreview = ({ onViewAllTasks }: TasksPreviewProps) => {
  const { tasks, loading } = useTasks();

  const getTaskIcon = (task: any) => {
    switch (task.type) {
      case 'reminder':
        return task.isOverdue ? 
          <Clock className="h-4 w-4 text-red-500" /> : 
          <Calendar className="h-4 w-4 text-orange-600" />;
      case 'lead_assignment':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'job_offer_assignment':
        return <Briefcase className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Chargement des tâches...
      </div>
    );
  }

  const pendingTasks = tasks.filter(task => !task.isCompleted).slice(0, 8);

  if (pendingTasks.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Aucune tâche en attente
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-80">
      <div className="p-3 space-y-3">
        {pendingTasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="mt-1">
              {getTaskIcon(task)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${task.isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                {task.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {task.description}
              </p>
              {task.isOverdue && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  En retard
                </p>
              )}
              {task.dueDate && !task.isOverdue && (
                <p className="text-xs text-orange-600 mt-1">
                  Échéance: {formatDistanceToNow(new Date(task.dueDate), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Créé {formatDistanceToNow(new Date(task.createdAt), { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </p>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={onViewAllTasks}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Voir toutes les tâches
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default TasksPreview;
