
import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Calendar, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCard } from './TaskCard';
import { Task } from '@/hooks/useTasks';

interface TasksOverviewProps {
  tasks: Task[];
  onComplete: (taskId: string, taskType: Task['type']) => void;
  onUpdateStatus: (taskId: string, taskType: Task['type'], status: string) => void;
}

export const TasksOverview = ({ tasks, onComplete, onUpdateStatus }: TasksOverviewProps) => {
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

  return (
    <div className="space-y-6">
      {/* Section principale : Tâches urgentes et en retard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-500" />
            Tâches prioritaires
            {mainTasks.length > 0 && (
              <Badge variant="destructive">{mainTasks.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mainTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-600 mb-2">Aucune tâche prioritaire</p>
              <p className="text-sm text-gray-500">
                Toutes vos tâches urgentes sont à jour !
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mainTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section tâches à venir (collapsible) */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
              onClick={() => setShowUpcoming(!showUpcoming)}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Tâches à venir</span>
                <Badge variant="secondary">{upcomingTasks.length}</Badge>
              </div>
              {showUpcoming ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          
          {showUpcoming && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={onComplete}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Section tâches terminées (collapsible) */}
      <Card>
        <CardHeader className="pb-3">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Tâches terminées</span>
              <Badge variant="outline">{completedTasks.length}</Badge>
            </div>
            {showCompleted ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        
        {showCompleted && (
          <CardContent className="pt-0">
            {completedTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Aucune tâche terminée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={onComplete}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};
