
import React, { useState, useEffect } from 'react';
import { CompactTaskCard } from './CompactTaskCard';
import { TaskDetailDialog } from './TaskDetailDialog';
import { DateRangeFilter } from './DateRangeFilter';
import { CompletedTasksSection } from './CompletedTasksSection';
import { Task } from '@/hooks/useTasks';
import { Badge } from '@/components/ui/badge';

interface TasksOverviewProps {
  tasks: Task[];
  onComplete: (taskId: string, taskType: Task['type']) => Promise<void>;
  onUpdateStatus: (taskId: string, taskType: Task['type'], status: string) => Promise<void>;
  onUpdateComment: (taskId: string, taskType: Task['type'], comment: string) => Promise<void>;
  onUpdateFollowUpDate: (taskId: string, taskType: Task['type'], date: Date | null) => Promise<void>;
  onReactivateTask: (taskId: string, taskType: Task['type']) => Promise<void>;
  selectedTaskId?: string | null;
}

export const TasksOverview = ({ 
  tasks, 
  onComplete, 
  onUpdateStatus, 
  onUpdateComment, 
  onUpdateFollowUpDate,
  onReactivateTask,
  selectedTaskId 
}: TasksOverviewProps) => {
  const [dateRange, setDateRange] = useState('15');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  // Filtrer les tâches par date
  const filteredTasks = tasks.filter(task => {
    if (dateRange === 'all') return true;
    
    const taskDate = new Date(task.createdAt);
    const now = new Date();
    const daysBack = parseInt(dateRange);
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return taskDate >= cutoffDate;
  });

  const pendingTasks = filteredTasks.filter(task => !task.isCompleted);
  const completedTasks = filteredTasks.filter(task => task.isCompleted);

  const overdueTasks = pendingTasks.filter(task => task.isOverdue);
  const upcomingTasks = pendingTasks.filter(task => !task.isOverdue);

  // Auto-scroll to selected task
  useEffect(() => {
    if (selectedTaskId) {
      setTimeout(() => {
        const element = document.getElementById(`task-${selectedTaskId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedTaskId]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDialog(true);
  };

  const handleTaskComplete = async (taskId: string, taskType: Task['type'], status?: string) => {
    if (status) {
      await onUpdateStatus(taskId, taskType, status);
    }
    await onComplete(taskId, taskType);
  };

  const handleTaskReactivate = async (taskId: string, taskType: Task['type']) => {
    await onReactivateTask(taskId, taskType);
  };

  return (
    <div className="space-y-6">
      {/* Filtre de date */}
      <div className="flex justify-between items-center">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        
        {/* Statistiques */}
        <div className="flex gap-4 flex-wrap">
          <Badge variant="destructive" className="text-sm">
            {overdueTasks.length} task{overdueTasks.length > 1 ? 's' : ''} en retard
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {upcomingTasks.length} task{upcomingTasks.length > 1 ? 's' : ''} à venir
          </Badge>
          <Badge variant="outline" className="text-sm">
            {completedTasks.length} task{completedTasks.length > 1 ? 's' : ''} terminée{completedTasks.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Tasks en retard */}
      {overdueTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            ⚠️ Tasks en retard ({overdueTasks.length})
          </h2>
          <div className="space-y-1">
            {overdueTasks.map((task) => (
              <div 
                key={task.id}
                className={selectedTaskId === task.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}
              >
                <CompactTaskCard
                  task={task}
                  onComplete={onComplete}
                  onUpdateStatus={onUpdateStatus}
                  onUpdateComment={onUpdateComment}
                  onUpdateFollowUpDate={onUpdateFollowUpDate}
                  onTaskClick={handleTaskClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks à venir */}
      {upcomingTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            📋 Tasks à venir ({upcomingTasks.length})
          </h2>
          <div className="space-y-1">
            {upcomingTasks.map((task) => (
              <div 
                key={task.id}
                className={selectedTaskId === task.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}
              >
                <CompactTaskCard
                  task={task}
                  onComplete={onComplete}
                  onUpdateStatus={onUpdateStatus}
                  onUpdateComment={onUpdateComment}
                  onUpdateFollowUpDate={onUpdateFollowUpDate}
                  onTaskClick={handleTaskClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message si aucune task */}
      {pendingTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <p className="text-lg mb-2">🎉 Aucune task en attente !</p>
            <p className="text-sm">Toutes vos tasks sont terminées.</p>
          </div>
        </div>
      )}

      {/* Tasks terminées */}
      {completedTasks.length > 0 && (
        <CompletedTasksSection 
          tasks={completedTasks}
          onUpdateStatus={onUpdateStatus}
          onUpdateComment={onUpdateComment}
          onUpdateFollowUpDate={onUpdateFollowUpDate}
          onTaskClick={handleTaskClick}
        />
      )}

      {/* Dialog de traitement de tâche */}
      <TaskDetailDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        task={selectedTask}
        onComplete={handleTaskComplete}
        onReactivate={handleTaskReactivate}
        onUpdateFollowUpDate={onUpdateFollowUpDate}
      />
    </div>
  );
};
