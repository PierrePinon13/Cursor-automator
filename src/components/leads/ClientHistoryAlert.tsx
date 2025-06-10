
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ClientHistoryAlertProps {
  alert: string;
}

const ClientHistoryAlert = ({ alert }: ClientHistoryAlertProps) => {
  if (!alert) return null;

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <strong>Historique client :</strong> {alert}
      </AlertDescription>
    </Alert>
  );
};

export default ClientHistoryAlert;
