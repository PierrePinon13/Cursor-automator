
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Phone, Minus } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';

interface PhoneContactStatusProps {
  leadId: string;
  phoneNumber: string;
  currentStatus?: string | null;
  onStatusUpdate: () => void;
}

const PhoneContactStatus = ({ 
  leadId, 
  phoneNumber, 
  currentStatus, 
  onStatusUpdate 
}: PhoneContactStatusProps) => {
  const [updating, setUpdating] = useState(false);
  const { createActivity } = useActivities();

  const updateContactStatus = async (status: 'positive' | 'negative' | 'neutral') => {
    setUpdating(true);
    try {
      await createActivity(
        leadId,
        'phone_call',
        {
          phone_number: phoneNumber
        },
        status
      );

      console.log(`Phone call status ${status} recorded for lead ${leadId}`);
      onStatusUpdate();
    } catch (error) {
      console.error('Error recording phone call activity:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'positive':
        return {
          icon: <ThumbsUp className="h-4 w-4" />,
          text: 'Contact positif',
          color: 'text-green-600'
        };
      case 'negative':
        return {
          icon: <ThumbsDown className="h-4 w-4" />,
          text: 'Contact négatif',
          color: 'text-red-600'
        };
      case 'neutral':
        return {
          icon: <Minus className="h-4 w-4" />,
          text: 'Contact neutre',
          color: 'text-gray-600'
        };
      default:
        return null;
    }
  };

  const statusDisplay = currentStatus ? getStatusDisplay(currentStatus) : null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-blue-700">
        <Phone className="h-5 w-5" />
        <span className="font-medium">Téléphone : {phoneNumber}</span>
      </div>
      
      {statusDisplay ? (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${statusDisplay.color}`}>
            {statusDisplay.icon}
            <span className="text-sm">{statusDisplay.text}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Contact téléphonique :</div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateContactStatus('positive')}
              disabled={updating}
              className="flex items-center gap-2 text-green-600 border-green-300 hover:bg-green-50"
            >
              <ThumbsUp className="h-4 w-4" />
              Positif
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateContactStatus('neutral')}
              disabled={updating}
              className="flex items-center gap-2 text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Minus className="h-4 w-4" />
              Neutre
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateContactStatus('negative')}
              disabled={updating}
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <ThumbsDown className="h-4 w-4" />
              Négatif
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneContactStatus;
