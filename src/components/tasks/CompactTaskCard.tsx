
import { useState } from 'react';
import { Circle, CheckCircle2, Calendar, User, Briefcase, Clock, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/hooks/useTasks';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TaskStatusSelect } from './TaskStatusSelect';
import { FollowUpDatePicker } from './FollowUpDatePicker';
import { TaskCommentInput } from './TaskCommentInput';
import { TaskCompletionDialog } from './TaskCompletionDialog';

interface CompactTaskCardProps {
  task: Task;
  onComplete: (taskId: string, taskType: Task['type']) => void;
  onUpdateStatus: (taskId: string, taskType: Task['type'], status: string) => void;
  onUpdateComment: (taskId: string, taskType: Task['type'], comment: string) => void;
  onUpdateFollowUpDate: (taskId: string, taskType: Task['type'], date: Date | null) => void;
}

export const CompactTaskCard = ({ 
  task, 
  onComplete, 
  onUpdateStatus, 
  onUpdateComment,
  onUpdateFollowUpDate 
}: CompactTaskCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const handleBulletClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.isCompleted) return;
    
    // Pour les reminders, compléter directement
    if (task.type === 'reminder') {
      onComplete(task.id, task.type);
      return;
    }
    
    // Pour les autres types, ouvrir le dialogue de sélection
    setShowCompletionDialog(true);
  };

  const handleTaskClick = () => {
    setShowDetails(!showDetails);
  };

  const handleCompleteWithStatus = (status: string) => {
    if (status) {
      onUpdateStatus(task.id, task.type, status);
    }
    onComplete(task.id, task.type);
    setShowCompletionDialog(false);
  };

  const getTaskIcon = () => {
    switch (task.type) {
      case 'reminder':
        return <Calendar className="h-3 w-3" />;
      case 'lead_assignment':
        return <User className="h-3 w-3" />;
      case 'job_offer_assignment':
        return <Briefcase className="h-3 w-3" />;
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
    
    if (status === 'a_relancer' && !getCurrentFollowUpDate()) {
      onUpdateFollowUpDate(task.id, task.type, new Date());
    }
  };

  const handleCommentChange = (comment: string) => {
    onUpdateComment(task.id, task.type, comment);
  };

  const handleFollowUpDateChange = (date: Date | null) => {
    onUpdateFollowUpDate(task.id, task.type, date);
  };

  const handleAsapFollowUp = () => {
    onUpdateFollowUpDate(task.id, task.type, new Date());
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

  return (
    <>
      <div 
        id={`task-${task.id}`}
        className={`flex items-center gap-3 p-3 border-l-2 cursor-pointer ${
          task.isOverdue ? 'border-l-red-500 bg-red-50/50' : 
          task.isCompleted ? 'border-l-green-500 bg-green-50/50' : 
          'border-l-blue-500 bg-white'
        } rounded-r-md hover:shadow-sm transition-all`}
        onClick={handleTaskClick}
      >
        {/* Checkbox */}
        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-5 w-5 flex-shrink-0"
          onClick={handleBulletClick}
          disabled={task.isCompleted}
        >
          {task.isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className={`h-4 w-4 transition-colors ${
              task.isOverdue ? 'text-red-500 hover:text-red-700' : 'text-gray-400 hover:text-blue-600'
            }`} />
          )}
        </Button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getTaskIcon()}
            <span className={`text-sm font-medium truncate ${
              task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {clientInfo ? `${clientInfo.clientName} - ${clientInfo.jobTitle}` : task.title}
            </span>
            
            {task.isOverdue && (
              <Badge variant="destructive" className="text-xs py-0 px-1">
                <Clock className="h-2 w-2 mr-1" />
                Retard
              </Badge>
            )}
          </div>

          {/* Quick actions when expanded */}
          {showDetails && (
            <div className="mt-2 space-y-2 p-2 bg-gray-50 rounded" onClick={(e) => e.stopPropagation()}>
              {needsStatusSelection && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">Statut:</span>
                  <TaskStatusSelect
                    currentStatus={getCurrentStatus()}
                    onStatusChange={handleStatusChange}
                    disabled={task.isCompleted}
                  />
                </div>
              )}
              
              {getCurrentStatus() === 'a_relancer' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">Relance:</span>
                  <FollowUpDatePicker
                    value={getCurrentFollowUpDate()}
                    onChange={handleFollowUpDateChange}
                    onAsapSelect={handleAsapFollowUp}
                  />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">Note:</span>
                <TaskCommentInput
                  value={getCurrentComment()}
                  onChange={handleCommentChange}
                />
              </div>

              {task.dueDate && (
                <p className={`text-xs ${task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  Échéance: {formatDistanceToNow(new Date(task.dueDate), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Expand button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="h-6 w-6 p-0 flex-shrink-0"
        >
          {showDetails ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </div>

      <TaskCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        task={task}
        onComplete={handleCompleteWithStatus}
      />
    </>
  );
};
