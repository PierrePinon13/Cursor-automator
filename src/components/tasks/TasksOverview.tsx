
import React, { useState, useEffect } from 'react';
import { IntegratedTaskCard } from './IntegratedTaskCard';
import { CompletedTasksSection } from './CompletedTasksSection';
import { Task } from '@/hooks/useTasks';
import { Badge } from '@/components/ui/badge';

interface TasksOverviewProps {
  tasks: Task[];
  onComplete: (taskId: string, taskType: Task['type']) => Promise<void>;
  onUpdateStatus: (taskId: string, taskType: Task['type'], status: string) => Promise<void>;
  onUpdateComment: (taskId: string, taskType: Task['type'], comment: string) => Promise<void>;
  onUpdateFollowUpDate: (taskId: string, taskType: Task['type'], date: Date | null) => Promise<void>;
  selectedTaskId?: string | null;
}

export const TasksOverview = ({ 
  tasks, 
  onComplete, 
  onUpdateStatus, 
  onUpdateComment, 
  onUpdateFollowUpDate,
  selectedTaskId 
}: TasksOverviewProps) => {
  const pendingTasks = tasks.filter(task => !task.isCompleted);
  const completedTasks = tasks.filter(task => task.isCompleted);

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

  return (
    <div className="space-y-6">
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

      {/* Tasks en retard */}
      {overdueTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            ⚠️ Tasks en retard ({overdueTasks.length})
          </h2>
          <div className="space-y-3">
            {overdueTasks.map((task) => (
              <div 
                key={task.id} 
                id={`task-${task.id}`}
                className={selectedTaskId === task.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}
              >
                <IntegratedTaskCard
                  task={task}
                  onComplete={onComplete}
                  onUpdateStatus={onUpdateStatus}
                  onUpdateComment={onUpdateComment}
                  onUpdateFollowUpDate={onUpdateFollowUpDate}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks à venir */}
      {upcomingTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            📋 Tasks à venir ({upcomingTasks.length})
          </h2>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div 
                key={task.id} 
                id={`task-${task.id}`}
                className={selectedTaskId === task.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}
              >
                <IntegratedTaskCard
                  task={task}
                  onComplete={onComplete}
                  onUpdateStatus={onUpdateStatus}
                  onUpdateComment={onUpdateComment}
                  onUpdateFollowUpDate={onUpdateFollowUpDate}
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
        />
      )}
    </div>
  );
};
