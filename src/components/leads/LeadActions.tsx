
import React from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin, Send, Phone, Calendar, UserCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';

interface Lead {
  id: string;
  author_name: string;
  author_headline: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_categorie: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
}

interface LeadActionsProps {
  lead: Lead;
  onSendLinkedInMessage: () => void;
  onAction: (actionName: string) => void;
  messageSending: boolean;
  message: string;
  onPhoneRetrieved?: (phoneNumber: string | null) => void;
}

const LeadActions = ({ 
  lead, 
  onSendLinkedInMessage, 
  onAction, 
  messageSending, 
  message,
  onPhoneRetrieved
}: LeadActionsProps) => {
  const { connections } = useLinkedInConnection();
  const { retrievePhone, loading: phoneLoading } = usePhoneRetrieval();
  const hasActiveConnection = connections.some(conn => conn.status === 'connected');

  // Fonction pour vérifier si le message est valide
  const isMessageValid = (messageText: string) => {
    return messageText.trim().length > 0 && messageText.length <= 300;
  };

  const messageValid = isMessageValid(message);

  const handlePhoneRetrieval = async () => {
    try {
      console.log('Starting phone retrieval for lead:', lead.id);
      const phoneNumber = await retrievePhone(lead.id);
      console.log('Phone retrieval result:', phoneNumber);
      
      // Toujours appeler le callback, même si phoneNumber est null
      if (onPhoneRetrieved) {
        onPhoneRetrieved(phoneNumber);
      }
    } catch (error) {
      console.error('Error in handlePhoneRetrieval:', error);
      // En cas d'erreur, appeler le callback avec null
      if (onPhoneRetrieved) {
        onPhoneRetrieved(null);
      }
    }
  };

  // Déterminer si on doit afficher le bouton ou le numéro
  const shouldShowPhoneButton = !lead.phone_retrieved_at;
  const hasPhoneNumber = lead.phone_number && lead.phone_number.trim() !== '';

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-800 mb-4">Actions disponibles</h4>
        
        <div className="space-y-3">
          {/* LinkedIn Message Action */}
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center gap-3 mb-3">
              <Linkedin className="h-5 w-5 text-blue-600" />
              <div>
                <h5 className="font-medium text-blue-900">Message LinkedIn</h5>
              </div>
            </div>
            
            {!hasActiveConnection ? (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mb-3">
                ⚠️ Aucune connexion LinkedIn active. Connectez votre compte LinkedIn d'abord.
              </div>
            ) : null}
            
            {!messageValid && message.length > 300 && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3">
                ❌ Le message dépasse la limite de 300 caractères. Veuillez le raccourcir.
              </div>
            )}
            
            <Button
              onClick={onSendLinkedInMessage}
              disabled={messageSending || !messageValid || !hasActiveConnection}
              className="w-full"
              size="sm"
            >
              {messageSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le message LinkedIn
                </>
              )}
            </Button>
          </div>

          {/* Other Actions */}
          <div className="space-y-2">
            {/* Phone Retrieval Action */}
            {shouldShowPhoneButton ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePhoneRetrieval}
                disabled={phoneLoading}
                className="w-full justify-start"
              >
                {phoneLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Récupération en cours...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Récupérer téléphone
                  </>
                )}
              </Button>
            ) : (
              <div className="p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4" />
                  {hasPhoneNumber ? (
                    <span className="font-medium text-green-700">Téléphone : {lead.phone_number}</span>
                  ) : (
                    <span className="font-medium text-gray-600">Aucun téléphone trouvé</span>
                  )}
                </div>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('schedule_callback')}
              className="w-full justify-start"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Planifier rappel
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('hr_provider')}
              className="w-full justify-start"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Prestataire RH
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('poorly_targeted')}
              className="w-full justify-start"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Publication mal ciblée
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadActions;
