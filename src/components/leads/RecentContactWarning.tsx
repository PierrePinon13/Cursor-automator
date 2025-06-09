
import React from 'react';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RecentContactWarningProps {
  contactedBy: string;
  hoursAgo: number;
  lastContactAt: string;
}

const RecentContactWarning = ({ contactedBy, hoursAgo, lastContactAt }: RecentContactWarningProps) => {
  const timeInfo = hoursAgo < 1 ? 
    `il y a ${Math.round(hoursAgo * 60)} minutes` : 
    `il y a ${hoursAgo} heure${hoursAgo > 1 ? 's' : ''}`;

  return (
    <Alert className="border-red-200 bg-red-50 mb-4">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4" />
          <strong>Contact récent détecté</strong>
        </div>
        <p className="mb-2">
          Ce lead a déjà été contacté par <strong>{contactedBy}</strong>
          <span className="flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            <span className="text-sm">{timeInfo}</span>
          </span>
        </p>
        <p className="text-sm">
          Pour éviter les contacts multiples, veuillez choisir un autre lead.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default RecentContactWarning;
