
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, User, Calendar } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface LeadActionPanelProps {
  lead: Lead;
  customMessage: string;
  onMessageChange: (message: string) => void;
  onSendLinkedInMessage: () => void;
  onAction: (actionName: string) => void;
  messageSending: boolean;
  onPhoneRetrieved: (phoneNumber: string | null) => void;
  onContactUpdate: () => void;
  onActionCompleted: () => void;
}

const LeadActionPanel = ({
  lead,
  customMessage,
  onMessageChange,
  onSendLinkedInMessage,
  onAction,
  messageSending,
  onPhoneRetrieved,
  onContactUpdate,
  onActionCompleted
}: LeadActionPanelProps) => {
  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statut du lead */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">Statut</label>
            <Badge 
              variant={lead.status === 'new' ? 'default' : 'secondary'}
              className="w-fit"
            >
              {lead.status || 'Nouveau'}
            </Badge>
          </div>

          {/* Message d'approche */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">
              Message d'approche
            </label>
            <Textarea
              value={customMessage || lead.approach_message || ''}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Écrivez votre message d'approche..."
              rows={6}
              className="resize-none"
            />
          </div>

          {/* Actions principales */}
          <div className="space-y-2">
            <Button
              onClick={onSendLinkedInMessage}
              disabled={messageSending || !customMessage.trim()}
              className="w-full"
              size="sm"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {messageSending ? 'Envoi...' : 'Envoyer message LinkedIn'}
            </Button>

            <Button
              onClick={() => onAction('get_phone')}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Phone className="h-4 w-4 mr-2" />
              Récupérer téléphone
            </Button>

            <Button
              onClick={() => onAction('contact')}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <User className="h-4 w-4 mr-2" />
              Marquer comme contacté
            </Button>

            <Button
              onClick={() => onAction('schedule_reminder')}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Programmer rappel
            </Button>
          </div>

          {/* Informations supplémentaires */}
          {lead.phone_number && (
            <div className="p-3 bg-green-50 rounded-lg">
              <label className="text-sm font-medium text-green-800">Téléphone</label>
              <p className="text-sm text-green-700">{lead.phone_number}</p>
            </div>
          )}

          {lead.last_contacted_at && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <label className="text-sm font-medium text-blue-800">Dernier contact</label>
              <p className="text-sm text-blue-700">
                {new Date(lead.last_contacted_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadActionPanel;
