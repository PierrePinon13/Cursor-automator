import { useState } from 'react';
import { Circle, CheckCircle2, Calendar, User, Briefcase, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Task } from '@/hooks/useTasks';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TaskCompletionDialog } from './TaskCompletionDialog';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string, taskType: Task['type']) => Promise<void>;
  onUpdateStatus: (taskId: string, taskType: Task['type'], status: string) => Promise<void>;
  onUpdateComment: (taskId: string, taskType: Task['type'], comment: string) => Promise<void>;
  onUpdateFollowUpDate: (taskId: string, taskType: Task['type'], date: Date | null) => Promise<void>;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const TaskCard = ({ 
  task, 
  onComplete, 
  onUpdateStatus, 
  onUpdateComment, 
  onUpdateFollowUpDate, 
  isExpanded = false, 
  onToggle 
}: TaskCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const handleCompleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher l'ouverture du popup
    if (task.type === 'job_offer_assignment' || task.type === 'lead_assignment') {
      setShowCompletionDialog(true);
    } else {
      handleComplete('');
    }
  };

  const handleTaskClick = () => {
    if (onToggle) {
      onToggle();
    } else {
      setShowDetail(true);
    }
  };

  const handleComplete = async (status: string) => {
    setIsCompleting(true);
    setShowAnimation(true);
    setShowCompletionDialog(false);
    
    // Mettre à jour le statut si nécessaire
    if (status && (task.type === 'job_offer_assignment' || task.type === 'lead_assignment')) {
      await onUpdateStatus(task.id, task.type, status);
    }
    
    setTimeout(async () => {
      await onComplete(task.id, task.type);
      setIsCompleting(false);
      setShowAnimation(false);
    }, 800);
  };

  const getTaskIcon = () => {
    switch (task.type) {
      case 'reminder':
        return <Calendar className="h-4 w-4" />;
      case 'lead_assignment':
        return <User className="h-4 w-4" />;
      case 'job_offer_assignment':
        return <Briefcase className="h-4 w-4" />;
    }
  };

  const getTaskBadge = () => {
    switch (task.type) {
      case 'reminder':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Rappel</Badge>;
      case 'lead_assignment':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Lead</Badge>;
      case 'job_offer_assignment':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Offre</Badge>;
    }
  };

  const getCurrentStatus = () => {
    if (task.type === 'job_offer_assignment') {
      return task.data.status || 'en_attente';
    } else if (task.type === 'lead_assignment') {
      return task.data.phone_contact_status || 'en_attente';
    }
    return '';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_attente':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En attente</Badge>;
      case 'negatif':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Négatif</Badge>;
      case 'positif':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Positif</Badge>;
      case 'a_relancer':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">À relancer</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{status}</Badge>;
    }
  };

  return (
    <>
      <Card 
        className={`hover:shadow-md transition-all duration-200 cursor-pointer ${task.isOverdue ? 'border-red-200 bg-red-50' : ''} ${task.isCompleted ? 'opacity-60' : ''}`}
        onClick={handleTaskClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-6 w-6 flex-shrink-0 mt-0.5"
              onClick={handleCompleteClick}
              disabled={isCompleting || task.isCompleted}
            >
              {showAnimation || task.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 animate-scale-in" />
              ) : (
                <Circle className={`h-5 w-5 transition-colors ${task.isOverdue ? 'text-red-500 hover:text-red-700' : 'text-gray-400 hover:text-blue-600'}`} />
              )}
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getTaskIcon()}
                    {getTaskBadge()}
                    {task.isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        En retard
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className={`font-medium mb-1 ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  
                  {task.dueDate && (
                    <p className={`text-xs mb-2 ${task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      Échéance: {formatDistanceToNow(new Date(task.dueDate), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </p>
                  )}

                  {/* Affichage du statut actuel pour les assignations */}
                  {(task.type === 'job_offer_assignment' || task.type === 'lead_assignment') && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Statut:</span>
                      {getStatusBadge(getCurrentStatus())}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de completion avec sélection de statut */}
      <TaskCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        task={task}
        onComplete={handleComplete}
      />

      {/* Modal de détails */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTaskIcon()}
              {task.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-gray-600">{task.description}</p>
            </div>
            
            {task.type === 'reminder' && task.data.lead && (
              <div>
                <h4 className="font-medium mb-2">Informations du lead</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <p><strong>Nom:</strong> {task.data.lead.author_name || 'Non renseigné'}</p>
                  <p><strong>Entreprise:</strong> {task.data.lead.company_name || 'Non renseignée'}</p>
                  <p><strong>Catégorie:</strong> {task.data.lead.openai_step3_categorie || 'Non définie'}</p>
                </div>
              </div>
            )}
            
            {task.type === 'lead_assignment' && (
              <div>
                <h4 className="font-medium mb-2">Détails du lead</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <p><strong>Nom:</strong> {task.data.author_name || 'Non renseigné'}</p>
                  <p><strong>Entreprise:</strong> {task.data.company_name || 'Non renseignée'}</p>
                  <p><strong>Position:</strong> {task.data.company_position || 'Non renseignée'}</p>
                  <p><strong>Catégorie:</strong> {task.data.openai_step3_categorie || 'Non définie'}</p>
                  {task.data.phone_number && (
                    <p><strong>Téléphone:</strong> {task.data.phone_number}</p>
                  )}
                </div>
              </div>
            )}
            
            {task.type === 'job_offer_assignment' && (
              <div>
                <h4 className="font-medium mb-2">Détails de l'offre</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <p><strong>Titre:</strong> {task.data.title}</p>
                  <p><strong>Entreprise:</strong> {task.data.company_name || 'Non renseignée'}</p>
                  <p><strong>Localisation:</strong> {task.data.location || 'Non renseignée'}</p>
                  <p><strong>Type:</strong> {task.data.job_type || 'Non renseigné'}</p>
                  {task.data.salary && (
                    <p><strong>Salaire:</strong> {task.data.salary}</p>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="font-medium mb-2">Informations de la tâche</h4>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <p><strong>Type:</strong> {getTaskBadge()}</p>
                <p><strong>Créée le:</strong> {formatDistanceToNow(new Date(task.createdAt), { 
                  addSuffix: true, 
                  locale: fr 
                })}</p>
                {task.dueDate && (
                  <p><strong>Échéance:</strong> {formatDistanceToNow(new Date(task.dueDate), { 
                    addSuffix: true, 
                    locale: fr 
                  })}</p>
                )}
                <p><strong>Priorité:</strong> 
                  <Badge 
                    variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                    className="ml-2"
                  >
                    {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </Badge>
                </p>
                {(task.type === 'job_offer_assignment' || task.type === 'lead_assignment') && (
                  <p><strong>Statut actuel:</strong> {getStatusBadge(getCurrentStatus())}</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
