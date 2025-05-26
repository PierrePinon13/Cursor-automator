
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

  const updateContactStatus = async (status: 'positive' | 'negative') => {
    setUpdating(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('linkedin_posts')
        .update({
          phone_contact_status: status,
          phone_contact_at: now,
          last_contact_at: now
        })
        .eq('id', leadId);

      if (error) {
        console.error('Error updating contact status:', error);
        return;
      }

      console.log(`Contact status updated to ${status} for lead ${leadId}`);
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating contact status:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-blue-700">
        <Phone className="h-5 w-5" />
        <span className="font-medium">Téléphone : {phoneNumber}</span>
      </div>
      
      {currentStatus ? (
        <div className="flex items-center gap-2">
          {currentStatus === 'positive' ? (
            <div className="flex items-center gap-2 text-green-600">
              <ThumbsUp className="h-4 w-4" />
              <span className="text-sm">Contact positif</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <ThumbsDown className="h-4 w-4" />
              <span className="text-sm">Contact négatif</span>
            </div>
          )}
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
