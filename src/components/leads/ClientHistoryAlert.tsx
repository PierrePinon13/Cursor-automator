
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Crown } from 'lucide-react';

interface ClientHistoryAlertProps {
  alert: string;
}

const ClientHistoryAlert = ({ alert }: ClientHistoryAlertProps) => {
  if (!alert) return null;

  // Essayer de parser le JSON si c'est du JSON
  let alertData;
  let displayMessage = alert;

  try {
    if (alert.startsWith('{') && alert.endsWith('}')) {
      alertData = JSON.parse(alert);
      
      if (alertData.client_name && alertData.company_name && alertData.position) {
        displayMessage = `Ce lead a travaillé chez ${alertData.client_name} (${alertData.company_name}) en tant que ${alertData.position}`;
        
        if (alertData.start_date && alertData.end_date) {
          displayMessage += ` du ${alertData.start_date} au ${alertData.end_date}`;
        } else if (alertData.start_date) {
          displayMessage += ` depuis ${alertData.start_date}`;
        }
        
        if (alertData.is_current) {
          displayMessage += ' (poste actuel)';
        }
      }
    }
  } catch (error) {
    // Si le parsing échoue, on garde le message original
    console.warn('Impossible de parser l\'alerte client:', error);
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <Crown className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <strong>Historique client :</strong> {displayMessage}
      </AlertDescription>
    </Alert>
  );
};

export default ClientHistoryAlert;
