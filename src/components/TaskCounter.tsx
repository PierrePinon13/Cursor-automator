
import { Badge } from '@/components/ui/badge';
import { useTasks } from '@/hooks/useTasks';

export const TaskCounter = () => {
  const { pendingCount } = useTasks();

  if (pendingCount === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className="ml-2 px-1.5 py-0.5 text-xs font-bold animate-pulse"
    >
      {pendingCount}
    </Badge>
  );
};
