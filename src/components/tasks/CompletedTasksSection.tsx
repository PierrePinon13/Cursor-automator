
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskCard } from './TaskCard';
import { Task } from '@/hooks/useTasks';

interface CompletedTasksSectionProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, taskType: Task['type'], status: string) => Promise<void>;
  onUpdateComment: (taskId: string, taskType: Task['type'], comment: string) => Promise<void>;
  onUpdateFollowUpDate: (taskId: string, taskType: Task['type'], date: Date | null) => Promise<void>;
}

export const CompletedTasksSection = ({ 
  tasks, 
  onUpdateStatus, 
  onUpdateComment, 
  onUpdateFollowUpDate 
}: CompletedTasksSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleTaskToggle = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  // Fonction vide pour onComplete car les tâches sont déjà terminées
  const handleComplete = async (taskId: string, taskType: Task['type']) => {
    // Ne rien faire - les tâches sont déjà terminées
  };

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 p-0"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="text-lg font-semibold">
          ✅ Tâches terminées ({tasks.length})
        </span>
      </Button>

      {isExpanded && (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onUpdateStatus={onUpdateStatus}
              onUpdateComment={onUpdateComment}
              onUpdateFollowUpDate={onUpdateFollowUpDate}
              isExpanded={expandedTaskId === task.id}
              onToggle={() => handleTaskToggle(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
