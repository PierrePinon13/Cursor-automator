
import React from 'react';
import { Linkedin, Phone, Calendar, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Lead {
  openai_step3_categorie: string;
  openai_step2_localisation: string;
}

interface LeadActionsProps {
  lead: Lead;
  onSendLinkedInMessage: () => void;
  onAction: (actionName: string) => void;
  messageSending: boolean;
  hasMessage: boolean;
}

const LeadActions = ({ 
  lead, 
  onSendLinkedInMessage, 
  onAction, 
  messageSending, 
  hasMessage 
}: LeadActionsProps) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-800">Actions</h4>
      
      <div className="space-y-3">
        <Button 
          className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-700"
          onClick={onSendLinkedInMessage}
          disabled={messageSending || !hasMessage}
        >
          <Linkedin className="h-4 w-4" />
          {messageSending ? 'Envoi en cours...' : 'Envoyer message LinkedIn'}
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3"
          onClick={() => onAction('Récupérer Téléphone')}
        >
          <Phone className="h-4 w-4" />
          Récupérer Téléphone
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3"
          onClick={() => onAction('Planifier un Rappel')}
        >
          <Calendar className="h-4 w-4" />
          Planifier un Rappel
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3"
          onClick={() => onAction('Prestataire RH')}
        >
          <Users className="h-4 w-4" />
          Prestataire RH
        </Button>
        
        <Button 
          variant="destructive" 
          className="w-full justify-start gap-3"
          onClick={() => onAction('Bad Job')}
        >
          <X className="h-4 w-4" />
          Bad Job
        </Button>
      </div>
      
      <div className="pt-4 border-t">
        <div className="text-xs text-gray-500 space-y-1">
          <div>Catégorie: {lead.openai_step3_categorie}</div>
          <div>Localisation: {lead.openai_step2_localisation || 'France'}</div>
        </div>
      </div>
    </div>
  );
};

export default LeadActions;
