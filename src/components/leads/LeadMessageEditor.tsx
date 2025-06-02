
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Lightbulb } from 'lucide-react';
import LeadActions from './LeadActions';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';

interface Lead {
  id: string;
  author_name: string;
  author_profile_url: string;
  approach_message?: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
  phone_contact_status?: string | null;
  phone_contact_at?: string | null;
  linkedin_message_sent_at?: string | null;
  last_contact_at?: string | null;
  unipile_response?: any;
}

interface LeadMessageEditorProps {
  lead: Lead;
  onAction: (actionName: string) => void;
  onPhoneRetrieved?: (phoneNumber: string | null) => void;
  onContactUpdate?: () => void;
}

const LeadMessageEditor = ({ 
  lead, 
  onAction,
  onPhoneRetrieved,
  onContactUpdate
}: LeadMessageEditorProps) => {
  const [message, setMessage] = useState('');
  const { sendMessage, loading: messageSending } = useLinkedInMessage();

  useEffect(() => {
    if (lead.approach_message) {
      setMessage(lead.approach_message);
    }
  }, [lead.approach_message]);

  const handleSendMessage = async () => {
    const success = await sendMessage(lead.id, message, {
      author_name: lead.author_name,
      author_profile_url: lead.author_profile_url
    });
    
    if (success) {
      onAction('message_sent');
    }
  };

  const messageLength = message.length;
  const isMessageTooLong = messageLength > 300;
  const charactersLeft = 300 - messageLength;

  return (
    <div className="space-y-6">
      {/* Message Editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Message d'approche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lead.approach_message && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <strong>Suggestion IA :</strong> Vous pouvez personnaliser ce message généré automatiquement
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Rédigez votre message LinkedIn..."
              className="min-h-[120px] resize-none"
              maxLength={350}
            />
            <div className="flex justify-between items-center text-sm">
              <span className={`${
                isMessageTooLong ? 'text-red-500' : 
                charactersLeft <= 50 ? 'text-orange-500' : 
                'text-gray-500'
              }`}>
                {charactersLeft} caractères restants
              </span>
              {isMessageTooLong && (
                <span className="text-red-500 font-medium">
                  Dépassement de {Math.abs(charactersLeft)} caractères
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Actions */}
      <LeadActions
        lead={lead}
        onAction={onAction}
        onSendLinkedInMessage={handleSendMessage}
        messageSending={messageSending}
        message={message}
        onPhoneRetrieved={onPhoneRetrieved}
        onContactUpdate={onContactUpdate}
      />
    </div>
  );
};

export default LeadMessageEditor;
