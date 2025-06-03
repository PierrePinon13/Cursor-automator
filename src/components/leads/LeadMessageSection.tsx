
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface Lead {
  approach_message?: string;
}

interface LeadMessageSectionProps {
  lead: Lead;
  customMessage: string;
  onMessageChange: (message: string) => void;
}

const LeadMessageSection = ({ 
  lead, 
  customMessage,
  onMessageChange
}: LeadMessageSectionProps) => {
  const messageLength = customMessage.length;
  const isMessageTooLong = messageLength > 300;
  const charactersLeft = 300 - messageLength;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Message d'approche
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <div className="flex-1 flex flex-col space-y-2">
          <Textarea
            value={customMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Rédigez votre message LinkedIn..."
            className="flex-1 resize-none"
            maxLength={350}
          />
          <div className="flex justify-between items-center text-sm flex-shrink-0">
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
  );
};

export default LeadMessageSection;
