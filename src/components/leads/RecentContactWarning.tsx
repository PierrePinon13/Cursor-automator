
import React from 'react';
import { AlertTriangle, Clock, User, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface RecentContactWarningProps {
  contactedBy?: string;
  hoursAgo?: number;
  lastContactAt?: string;
  onClose: () => void;
  onContinueAnyway: () => void;
}

const RecentContactWarning = ({ 
  contactedBy, 
  hoursAgo, 
  lastContactAt, 
  onClose, 
  onContinueAnyway 
}: RecentContactWarningProps) => {
  const timeInfo = hoursAgo && hoursAgo < 1 ? 
    `il y a ${Math.round(hoursAgo * 60)} minutes` : 
    `il y a ${hoursAgo} heure${hoursAgo && hoursAgo > 1 ? 's' : ''}`;

  return (
    <div className="p-6 bg-red-50 border-l-4 border-red-400">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Alert className="border-red-200 bg-red-50 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <strong>Contact récent détecté</strong>
              </div>
              <p className="mb-2">
                Ce lead a déjà été contacté par <strong>{contactedBy || 'un utilisateur'}</strong>
                {hoursAgo && (
                  <span className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm">{timeInfo}</span>
                  </span>
                )}
              </p>
              <p className="text-sm">
                Pour éviter les contacts multiples, veuillez choisir un autre lead.
              </p>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Choisir un autre lead
            </Button>
            <Button 
              variant="destructive" 
              onClick={onContinueAnyway}
              className="flex-1"
            >
              Continuer quand même
            </Button>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="ml-4 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default RecentContactWarning;
