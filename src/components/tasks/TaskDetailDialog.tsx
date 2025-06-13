
import React, { useState } from 'react';
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
import { FollowUpDatePicker } from './FollowUpDatePicker';

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onComplete: (taskId: string, taskType: Task['type'], status?: string) => void;
  onReactivate?: (taskId: string, taskType: Task['type']) => void;
  onUpdateFollowUpDate?: (taskId: string, taskType: Task['type'], date: Date | null) => void;
}

export const TaskDetailDialog = ({ 
  open, 
  onOpenChange, 
  task,
  onComplete,
  onReactivate,
  onUpdateFollowUpDate
}: TaskDetailDialogProps) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      onOpenChange(false);
    } else {
      setShowDatePicker(true);
    }
  };

  const handleRelanceWithDate = (date: Date | null) => {
    if (onUpdateFollowUpDate) {
      onUpdateFollowUpDate(task.id, task.type, date);
    }
    onComplete(task.id, task.type, 'a_relancer');
    setShowDatePicker(false);
    onOpenChange(false);
  };

  const handleRelanceAsap = () => {
    if (onUpdateFollowUpDate) {
      onUpdateFollowUpDate(task.id, task.type, new Date());
    }
    onComplete(task.id, task.type, 'a_relancer');
    setShowDatePicker(false);
    onOpenChange(false);
  };

  const handleReactivateClick = () => {
    if (onReactivate) {
      onReactivate(task.id, task.type);
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
            <span>{task.isCompleted ? 'Tâche terminée' : 'Traitement de la tâche'}</span>
            {task.isOverdue && !task.isCompleted && (
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
              <p className={`text-sm ${task.isOverdue && !task.isCompleted ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                Échéance: {formatDistanceToNow(new Date(task.dueDate), { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </p>
            )}
          </div>

          {/* Boutons d'action */}
          {task.isCompleted ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="text-green-700 text-sm">
                  ✅ Cette tâche a été marquée comme terminée
                </p>
              </div>
              <Button
                onClick={handleReactivateClick}
                variant="outline"
                className="w-full"
              >
                Remettre en actif
              </Button>
            </div>
          ) : showDatePicker ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">
                Choisir la date de relance :
              </h4>
              <div className="flex gap-3">
                <Button
                  onClick={handleRelanceAsap}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Immédiatement
                </Button>
                <FollowUpDatePicker
                  value={null}
                  onChange={handleRelanceWithDate}
                  onAsapSelect={handleRelanceAsap}
                />
              </div>
              <Button
                onClick={() => setShowDatePicker(false)}
                variant="outline"
                className="w-full"
              >
                Annuler
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h4 className="font-medium text-gray-700">
                {isReminder ? 'Marquer comme lu ?' : 'Résultat du contact :'}
              </h4>
              
              <div className="flex gap-3">
                <Button
                  onClick={handlePositiveClick}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isReminder ? 'Marquer comme lu' : 'Positif'}
                </Button>
                
                {!isReminder && (
                  <>
                    <Button
                      onClick={handleNegativeClick}
                      variant="destructive"
                      className="flex-1"
                    >
                      Négatif
                    </Button>
                    
                    <Button
                      onClick={handleRelanceClick}
                      variant="outline"
                      className="flex-1"
                    >
                      À relancer
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
