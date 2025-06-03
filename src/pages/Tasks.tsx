
import { SidebarTrigger } from '@/components/ui/sidebar';
import { TasksOverview } from '@/components/tasks/TasksOverview';
import { useTasks } from '@/hooks/useTasks';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { Loader2 } from 'lucide-react';

const Tasks = () => {
  const { 
    tasks, 
    loading, 
    completeTask, 
    updateTaskStatus, 
    updateTaskComment, 
    updateTaskFollowUpDate 
  } = useTasks();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
          </div>
          <UserActionsDropdown />
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Chargement des tâches...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
        </div>
        
        <UserActionsDropdown />
      </div>

      <div className="max-w-4xl mx-auto">
        <TasksOverview 
          tasks={tasks} 
          onComplete={completeTask}
          onUpdateStatus={updateTaskStatus}
          onUpdateComment={updateTaskComment}
          onUpdateFollowUpDate={updateTaskFollowUpDate}
        />
      </div>
    </div>
  );
};

export default Tasks;
