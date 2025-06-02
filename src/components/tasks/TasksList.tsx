
import { useReminders } from '@/hooks/useReminders';
import { TaskItem } from './TaskItem';

export const TasksList = () => {
  const { reminders, markAsRead } = useReminders();

  const pendingTasks = reminders.filter(reminder => !reminder.read);

  const handleTaskComplete = async (taskId: string) => {
    await markAsRead(taskId);
  };

  if (pendingTasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Aucune tâche en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onComplete={handleTaskComplete}
        />
      ))}
    </div>
  );
};
