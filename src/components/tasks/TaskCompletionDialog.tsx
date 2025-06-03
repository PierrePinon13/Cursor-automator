
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/hooks/useTasks';

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onComplete: (status: string) => void;
}

export const TaskCompletionDialog = ({ 
  open, 
  onOpenChange, 
  task, 
  onComplete 
}: TaskCompletionDialogProps) => {
  const getStatusOptions = () => {
    if (task.type === 'job_offer_assignment' || task.type === 'lead_assignment') {
      return [
        { value: 'negatif', label: 'Négatif', color: 'bg-red-100 text-red-800 border-red-200' },
        { value: 'positif', label: 'Positif', color: 'bg-green-100 text-green-800 border-green-200' },
        { value: 'a_relancer', label: 'À relancer', color: 'bg-orange-100 text-orange-800 border-orange-200' }
      ];
    }
    return [];
  };

  const statusOptions = getStatusOptions();

  if (statusOptions.length === 0) {
    // Pour les rappels, pas besoin de sélection de statut
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer la tâche comme terminée</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir marquer cette tâche comme terminée ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => onComplete('')}>
              Marquer comme terminée
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Changer le statut</AlertDialogTitle>
          <AlertDialogDescription>
            Sélectionnez le statut final pour cette tâche avant de la marquer comme terminée.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 py-4">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onComplete(option.value)}
              className="w-full"
            >
              <Badge 
                variant="outline" 
                className={`${option.color} hover:opacity-80 transition-opacity px-4 py-2 text-sm font-medium border-2 w-full justify-center cursor-pointer`}
              >
                {option.label}
              </Badge>
            </button>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
