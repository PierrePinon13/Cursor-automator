
import React from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin, Send, CheckCircle, Star, Calendar, Loader2 } from 'lucide-react';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';

interface Lead {
  id: string;
  author_name: string;
  author_headline: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_categorie: string;
}

interface LeadActionsProps {
  lead: Lead;
  onSendLinkedInMessage: () => void;
  onAction: (actionName: string) => void;
  messageSending: boolean;
  message: string;
}

const LeadActions = ({ 
  lead, 
  onSendLinkedInMessage, 
  onAction, 
  messageSending, 
  message 
}: LeadActionsProps) => {
  const { connections } = useLinkedInConnection();
  const hasActiveConnection = connections.some(conn => conn.status === 'connected');

  // Fonction pour vérifier si le message est valide
  const isMessageValid = (messageText: string) => {
    return messageText.trim().length > 0 && messageText.length <= 300;
  };

  const messageValid = isMessageValid(message);

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
                <p className="text-xs text-blue-700">
                  Envoyer un message personnalisé via LinkedIn
                </p>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('mark_contacted')}
              className="w-full justify-start"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marquer comme contacté
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('add_to_favorites')}
              className="w-full justify-start"
            >
              <Star className="h-4 w-4 mr-2" />
              Ajouter aux favoris
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('schedule_followup')}
              className="w-full justify-start"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Programmer un suivi
            </Button>
          </div>
        </div>
      </div>

      {/* Lead Information Summary */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <h5 className="font-medium text-gray-800 mb-2">Résumé du contact</h5>
        <div className="space-y-1 text-xs text-gray-600">
          <p><strong>Nom :</strong> {lead.author_name}</p>
          <p><strong>Titre :</strong> {lead.author_headline}</p>
          {lead.openai_step3_postes_selectionnes && (
            <p><strong>Postes recherchés :</strong> {lead.openai_step3_postes_selectionnes.join(', ')}</p>
          )}
          {lead.openai_step3_categorie && (
            <p><strong>Secteur :</strong> {lead.openai_step3_categorie}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadActions;
