
import React, { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TasksOverview } from '@/components/tasks/TasksOverview';
import { useSearchParams } from 'react-router-dom';

const Tasks = () => {
  const [searchParams] = useSearchParams();
  const selectedTaskId = searchParams.get('taskId');
  
  const {
    tasks,
    loading,
    completeTask,
    reactivateTask,
    updateTaskStatus,
    updateTaskComment,
    updateTaskFollowUpDate
  } = useTasks();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Chargement des tâches...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes tâches</h1>
        <p className="text-gray-600 mt-1">
          Gérez vos tâches et suivez leur progression
        </p>
      </div>

      <TasksOverview
        tasks={tasks}
        onComplete={completeTask}
        onUpdateStatus={updateTaskStatus}
        onUpdateComment={updateTaskComment}
        onUpdateFollowUpDate={updateTaskFollowUpDate}
        onReactivateTask={reactivateTask}
        selectedTaskId={selectedTaskId}
      />
    </div>
  );
};

export default Tasks;
