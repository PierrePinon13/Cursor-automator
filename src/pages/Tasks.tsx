
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { TasksList } from '@/components/tasks/TasksList';
import { CompletedTasksSection } from '@/components/tasks/CompletedTasksSection';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const Tasks = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
        </div>
        
        <UserActionsDropdown />
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Tâches à réaliser</h2>
          <TasksList />
        </div>

        <CompletedTasksSection />
      </div>
    </div>
  );
};

export default Tasks;
