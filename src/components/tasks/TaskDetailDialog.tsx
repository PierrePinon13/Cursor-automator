
import React from 'react';
import { Calendar, User, Briefcase, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/hooks/useTasks';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onComplete: (taskId: string, taskType: Task['type'], status?: string) => void;
}

export const TaskDetailDialog = ({ 
  open, 
  onOpenChange, 
  task,
  onComplete 
}: TaskDetailDialogProps) => {
  if (!task) return null;

  const getTaskIcon = () => {
    switch (task.type) {
      case 'reminder':
        return <Calendar className="h-5 w-5" />;
      case 'lead_assignment':
        return <User className="h-5 w-5" />;
      case 'job_offer_assignment':
        return <Briefcase className="h-5 w-5" />;
    }
  };

  const getClientInfo = () => {
    if (task.type === 'job_offer_assignment') {
      return {
        clientName: task.data.matched_client_name || task.data.company_name || 'Client inconnu',
        jobTitle: task.data.title || 'Poste non défini'
      };
    } else if (task.type === 'lead_assignment') {
      return {
        clientName: task.data.matched_client_name || task.data.company_name || 'Client inconnu', 
        jobTitle: task.data.openai_step3_categorie || 'Catégorie non définie'
      };
    }
    return null;
  };

  const clientInfo = getClientInfo();

  const handlePositiveClick = () => {
    if (task.type === 'reminder') {
      onComplete(task.id, task.type);
    } else {
      onComplete(task.id, task.type, 'positif');
    }
    onOpenChange(false);
  };

  const handleNegativeClick = () => {
    if (task.type === 'reminder') {
      onComplete(task.id, task.type);
    } else {
      onComplete(task.id, task.type, 'negatif');
    }
    onOpenChange(false);
  };

  const handleRelanceClick = () => {
    if (task.type === 'reminder') {
      onComplete(task.id, task.type);
    } else {
      onComplete(task.id, task.type, 'a_relancer');
    }
    onOpenChange(false);
  };

  const isReminder = task.type === 'reminder';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getTaskIcon()}
            <span>Traitement de la tâche</span>
            {task.isOverdue && (
              <Badge variant="destructive" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                En retard
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de la tâche */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">
              {clientInfo ? `${clientInfo.clientName} - ${clientInfo.jobTitle}` : task.title}
            </h3>
            
            {task.description && (
              <p className="text-gray-600 mb-3">{task.description}</p>
            )}

            {task.dueDate && (
              <p className={`text-sm ${task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                Échéance: {formatDistanceToNow(new Date(task.dueDate), { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </p>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col gap-3">
            <h4 className="font-medium text-gray-700">
              {isReminder ? 'Marquer comme lu ?' : 'Résultat du contact :'}
            </h4>
            
            <div className="flex gap-3">
              <Button
                onClick={handlePositiveClick}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={task.isCompleted}
              >
                {isReminder ? 'Marquer comme lu' : 'Positif'}
              </Button>
              
              {!isReminder && (
                <>
                  <Button
                    onClick={handleNegativeClick}
                    variant="destructive"
                    className="flex-1"
                    disabled={task.isCompleted}
                  >
                    Négatif
                  </Button>
                  
                  <Button
                    onClick={handleRelanceClick}
                    variant="outline"
                    className="flex-1"
                    disabled={task.isCompleted}
                  >
                    À relancer
                  </Button>
                </>
              )}
            </div>
          </div>

          {task.isCompleted && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-green-700 text-sm">
                ✅ Cette tâche a été marquée comme terminée
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
