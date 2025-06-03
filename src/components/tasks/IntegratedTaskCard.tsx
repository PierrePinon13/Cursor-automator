
import { useState } from 'react';
import { Circle, CheckCircle2, Calendar, User, Briefcase, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/hooks/useTasks';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TaskStatusSelect } from './TaskStatusSelect';
import { FollowUpDatePicker } from './FollowUpDatePicker';
import { TaskCommentInput } from './TaskCommentInput';

interface IntegratedTaskCardProps {
  task: Task;
  onComplete: (taskId: string, taskType: Task['type']) => void;
  onUpdateStatus: (taskId: string, taskType: Task['type'], status: string) => void;
  onUpdateComment: (taskId: string, taskType: Task['type'], comment: string) => void;
  onUpdateFollowUpDate: (taskId: string, taskType: Task['type'], date: Date | null) => void;
}

export const IntegratedTaskCard = ({ 
  task, 
  onComplete, 
  onUpdateStatus, 
  onUpdateComment,
  onUpdateFollowUpDate 
}: IntegratedTaskCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const handleCompleteClick = async () => {
    setIsCompleting(true);
    setShowAnimation(true);
    
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
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Rappel</Badge>;
      case 'lead_assignment':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Lead</Badge>;
      case 'job_offer_assignment':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Offre</Badge>;
    }
  };

  const getCurrentStatus = () => {
    if (task.type === 'job_offer_assignment') {
      return task.data.status || 'en_attente';
    } else if (task.type === 'lead_assignment') {
      return task.data.phone_contact_status || 'en_attente';
    }
    return 'en_attente';
  };

  const getCurrentComment = () => {
    return task.data.task_comment || '';
  };

  const getCurrentFollowUpDate = () => {
    return task.data.follow_up_date ? new Date(task.data.follow_up_date) : null;
  };

  const needsStatusSelection = task.type === 'job_offer_assignment' || task.type === 'lead_assignment';

  const handleStatusChange = (status: string) => {
    onUpdateStatus(task.id, task.type, status);
  };

  const handleCommentChange = (comment: string) => {
    onUpdateComment(task.id, task.type, comment);
  };

  const handleFollowUpDateChange = (date: Date | null) => {
    onUpdateFollowUpDate(task.id, task.type, date);
  };

  const handleAsapFollowUp = () => {
    // "Dès que possible" = date d'aujourd'hui
    onUpdateFollowUpDate(task.id, task.type, new Date());
  };

  return (
    <div className={`border-l-4 ${task.isOverdue ? 'border-l-red-500 bg-red-50' : task.isCompleted ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500'} p-4 bg-white rounded-r-lg hover:shadow-sm transition-shadow`}>
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
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {getTaskIcon()}
              {getTaskBadge()}
              {task.isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  En retard
                </Badge>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-auto p-1"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            </Button>
          </div>
          
          <h3 className={`font-medium mb-1 text-sm ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {task.title}
          </h3>
          
          <p className="text-xs text-gray-600 mb-2">{task.description}</p>
          
          {/* Actions et statut en une ligne */}
          <div className="flex items-center gap-4 flex-wrap">
            {needsStatusSelection && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Statut:</span>
                <TaskStatusSelect
                  currentStatus={getCurrentStatus()}
                  onStatusChange={handleStatusChange}
                  disabled={task.isCompleted}
                />
              </div>
            )}
            
            {getCurrentStatus() === 'a_relancer' && (
              <FollowUpDatePicker
                value={getCurrentFollowUpDate()}
                onChange={handleFollowUpDateChange}
                onAsapSelect={handleAsapFollowUp}
              />
            )}
            
            <TaskCommentInput
              value={getCurrentComment()}
              onChange={handleCommentChange}
            />
          </div>
          
          {task.dueDate && (
            <p className={`text-xs mt-2 ${task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              Échéance: {formatDistanceToNow(new Date(task.dueDate), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
          )}
          
          {/* Détails dépliables */}
          {showDetails && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="text-xs">
                <p><strong>Créée le:</strong> {formatDistanceToNow(new Date(task.createdAt), { 
                  addSuffix: true, 
                  locale: fr 
                })}</p>
                <p><strong>Priorité:</strong> 
                  <Badge 
                    variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                    className="ml-2 text-xs"
                  >
                    {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </Badge>
                </p>
              </div>
              
              {task.type === 'lead_assignment' && (
                <div className="text-xs">
                  <p><strong>Contact:</strong> {task.data.author_name || 'Non renseigné'}</p>
                  <p><strong>Entreprise:</strong> {task.data.company_name || 'Non renseignée'}</p>
                  {task.data.phone_number && (
                    <p><strong>Téléphone:</strong> {task.data.phone_number}</p>
                  )}
                </div>
              )}
              
              {task.type === 'job_offer_assignment' && (
                <div className="text-xs">
                  <p><strong>Titre:</strong> {task.data.title}</p>
                  <p><strong>Entreprise:</strong> {task.data.company_name || 'Non renseignée'}</p>
                  <p><strong>Localisation:</strong> {task.data.location || 'Non renseignée'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
