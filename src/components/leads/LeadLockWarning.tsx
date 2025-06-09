
import React from 'react';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LeadLockWarningProps {
  lockedByUserName: string;
  hoursAgo?: number;
  onClose?: () => void;
}

const LeadLockWarning = ({ lockedByUserName, hoursAgo, onClose }: LeadLockWarningProps) => {
  const timeInfo = hoursAgo !== undefined ? (
    hoursAgo < 1 ? 
      `il y a ${Math.round(hoursAgo * 60)} minutes` : 
      `il y a ${hoursAgo} heure${hoursAgo > 1 ? 's' : ''}`
  ) : '';

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-4">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4" />
          <strong>Lead en cours de traitement</strong>
        </div>
        <p className="mb-2">
          Ce lead est actuellement en cours de traitement par <strong>{lockedByUserName}</strong>
          {timeInfo && (
            <span className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              <span className="text-sm">Verrouillé {timeInfo}</span>
            </span>
          )}
        </p>
        <p className="text-sm">
          Merci de revenir plus tard ou de choisir un autre lead.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Fermer
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default LeadLockWarning;
