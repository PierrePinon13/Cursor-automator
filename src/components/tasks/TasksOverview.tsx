
import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Calendar, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IntegratedTaskCard } from './IntegratedTaskCard';
import { Task } from '@/hooks/useTasks';

interface TasksOverviewProps {
  tasks: Task[];
  onComplete: (taskId: string, taskType: Task['type']) => void;
  onUpdateStatus: (taskId: string, taskType: Task['type'], status: string) => void;
  onUpdateComment: (taskId: string, taskType: Task['type'], comment: string) => void;
  onUpdateFollowUpDate: (taskId: string, taskType: Task['type'], date: Date | null) => void;
}

export const TasksOverview = ({ 
  tasks, 
  onComplete, 
  onUpdateStatus, 
  onUpdateComment, 
  onUpdateFollowUpDate 
}: TasksOverviewProps) => {
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

  // Filtrer les tâches
  const overdueTasks = tasks.filter(task => task.isOverdue && !task.isCompleted);
  const urgentTasks = tasks.filter(task => 
    !task.isCompleted && 
    !task.isOverdue && 
    task.dueDate && 
    new Date(task.dueDate) <= threeDaysFromNow
  );
  const upcomingTasks = tasks.filter(task => 
    !task.isCompleted && 
    !task.isOverdue && 
    (!task.dueDate || new Date(task.dueDate) > threeDaysFromNow)
  );
  const completedTasks = tasks.filter(task => task.isCompleted);

  // Tâches principales à afficher (retard + urgentes)
  const mainTasks = [...overdueTasks, ...urgentTasks];

  const SectionHeader = ({ 
    icon, 
    title, 
    count, 
    variant = "default", 
    isExpanded, 
    onToggle 
  }: {
    icon: React.ReactNode;
    title: string;
    count: number;
    variant?: "default" | "destructive" | "outline";
    isExpanded?: boolean;
    onToggle?: () => void;
  }) => (
    <div 
      className="flex items-center justify-between py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 px-2 rounded"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <Badge variant={variant} className="text-xs">
          {count}
        </Badge>
      </div>
      {onToggle && (
        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Section principale : Tâches prioritaires */}
      <div>
        <SectionHeader
          icon={<Clock className="h-5 w-5 text-red-500" />}
          title="Tâches prioritaires"
          count={mainTasks.length}
          variant={mainTasks.length > 0 ? "destructive" : "outline"}
        />
        
        <div className="mt-4">
          {mainTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-600 mb-2">Aucune tâche prioritaire</p>
              <p className="text-sm text-gray-500">
                Toutes vos tâches urgentes sont à jour !
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {mainTasks.map((task) => (
                <IntegratedTaskCard
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onUpdateStatus={onUpdateStatus}
                  onUpdateComment={onUpdateComment}
                  onUpdateFollowUpDate={onUpdateFollowUpDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section tâches à venir */}
      {upcomingTasks.length > 0 && (
        <div>
          <SectionHeader
            icon={<Calendar className="h-5 w-5 text-blue-500" />}
            title="Tâches à venir"
            count={upcomingTasks.length}
            variant="outline"
            isExpanded={showUpcoming}
            onToggle={() => setShowUpcoming(!showUpcoming)}
          />
          
          {showUpcoming && (
            <div className="mt-4 space-y-2">
              {upcomingTasks.map((task) => (
                <IntegratedTaskCard
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onUpdateStatus={onUpdateStatus}
                  onUpdateComment={onUpdateComment}
                  onUpdateFollowUpDate={onUpdateFollowUpDate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section tâches terminées */}
      <div>
        <SectionHeader
          icon={<CheckSquare className="h-5 w-5 text-green-500" />}
          title="Tâches terminées"
          count={completedTasks.length}
          variant="outline"
          isExpanded={showCompleted}
          onToggle={() => setShowCompleted(!showCompleted)}
        />
        
        {showCompleted && (
          <div className="mt-4">
            {completedTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Aucune tâche terminée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <IntegratedTaskCard
                    key={task.id}
                    task={task}
                    onComplete={onComplete}
                    onUpdateStatus={onUpdateStatus}
                    onUpdateComment={onUpdateComment}
                    onUpdateFollowUpDate={onUpdateFollowUpDate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
