
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageTemplateProps {
  template: string;
  onChange: (template: string) => void;
}

export const MessageTemplate = ({ template, onChange }: MessageTemplateProps) => {
  const variables = [
    { name: '{{ firstName }}', description: 'Prénom du contact' },
    { name: '{{ jobTitle }}', description: 'Titre du poste' },
    { name: '{{ companyName }}', description: 'Nom de l\'entreprise' }
  ];

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = template.substring(0, start) + variable + template.substring(end);
      onChange(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="message_template">Message personnalisé</Label>
        <Textarea
          id="message_template"
          placeholder="Bonjour {{ firstName }}, j'ai vu que {{ companyName }} recrute un {{ jobTitle }}..."
          value={template}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="mt-1"
        />
      </div>

      {/* Variables disponibles */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Variables disponibles :</p>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => insertVariable(variable.name)}
              className="text-xs h-8 gap-1"
            >
              <Copy className="h-3 w-3" />
              {variable.name}
            </Button>
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {variables.map((variable, index) => (
            <p key={index} className="text-xs text-gray-500">
              <code className="bg-gray-100 px-1 rounded">{variable.name}</code> - {variable.description}
            </p>
          ))}
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Si vous laissez ce champ vide, aucun message ne sera envoyé automatiquement. 
          Vous pourrez personnaliser les messages individuellement lors de la prise de contact.
        </AlertDescription>
      </Alert>
    </div>
  );
};
