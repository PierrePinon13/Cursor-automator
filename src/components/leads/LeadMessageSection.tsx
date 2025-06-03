
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
    <Card className="h-full flex flex-col border-blue-200 bg-blue-50/20">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <span className="text-blue-900">Message d'approche</span>
            <p className="text-xs text-blue-700 font-normal">Personnalisez votre message</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <div className="flex-1 flex flex-col space-y-3">
          <Textarea
            value={customMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Rédigez votre message LinkedIn..."
            className="flex-1 resize-none bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-200"
            maxLength={350}
          />
          <div className="flex justify-between items-center text-sm flex-shrink-0 bg-white rounded-lg p-2 border border-blue-100">
            <span className={`font-medium ${
              isMessageTooLong ? 'text-red-500' : 
              charactersLeft <= 50 ? 'text-orange-500' : 
              'text-blue-600'
            }`}>
              {charactersLeft} caractères restants
            </span>
            {isMessageTooLong && (
              <span className="text-red-500 font-medium text-xs">
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
