import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeadProfileInfo from './LeadProfileInfo';
import LeadInfo from './LeadInfo';
import LeadPostContent from './LeadPostContent';
import LeadWorkHistory from './LeadWorkHistory';
import LeadMessageSection from './LeadMessageSection';
import PhoneContactStatus from './PhoneContactStatus';
import SimpleAppointmentDialog from '@/components/appointments/SimpleAppointmentDialog';

interface LeadDetailContentProps {
  lead: any;
  onActionCompleted: () => void;
  customMessage: string;
  onMessageChange: (message: string) => void;
  onSendLinkedInMessage: () => void;
  onAction: (actionName: string) => void;
  messageSending: boolean;
  onPhoneRetrieved: (phoneNumber: string | null) => void;
  onContactUpdate: () => void;
}

const LeadDetailContent = ({ 
  lead, 
  onActionCompleted, 
  customMessage, 
  onMessageChange, 
  onSendLinkedInMessage, 
  onAction, 
  messageSending, 
  onPhoneRetrieved, 
  onContactUpdate 
}: LeadDetailContentProps) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(lead.phone_number || null);
  const [isRetrievingPhone, setIsRetrievingPhone] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        
        {/* Alert pour RDV déjà programmé */}
        {lead.has_booked_appointment && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Rendez-vous programmé</span>
            </div>
            {lead.appointment_booked_at && (
              <p className="text-sm text-green-600 mt-1">
                Programmé le {format(new Date(lead.appointment_booked_at), 'dd/MM/yyyy à HH:mm')}
              </p>
            )}
          </div>
        )}

        {/* Informations du profil */}
        <LeadProfileInfo lead={lead} />

        {/* Informations sur l'entreprise */}
        <LeadInfo lead={lead} />

        {/* Contenu du post */}
        <LeadPostContent lead={lead} />

        {/* Historique professionnel */}
        <LeadWorkHistory lead={lead} />

        {/* Section des actions */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
          
          {/* Actions rapides */}
          <div className="flex flex-wrap gap-3">
            <SimpleAppointmentDialog
              leadId={lead.id}
              leadName={lead.author_name}
              onSuccess={onActionCompleted}
            />
            
            <PhoneContactStatus
              lead={lead}
              onContactUpdate={onContactUpdate}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('positive_response')}
              className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
            >
              <ThumbsUp className="h-4 w-4" />
              Réponse positive
            </Button>
          </div>

          {/* Section message LinkedIn */}
          <LeadMessageSection
            lead={lead}
            customMessage={customMessage}
            onMessageChange={onMessageChange}
            onSendLinkedInMessage={onSendLinkedInMessage}
            messageSending={messageSending}
          />
        </div>
      </div>
    </div>
  );
};

export default LeadDetailContent;
