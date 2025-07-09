import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface MessageTemplateProps {
  template: string;
  onChange: (template: string) => void;
}

export const MessageTemplate = ({ template, onChange }: MessageTemplateProps) => {
  const variables = [
    { name: '{{firstName}}', description: 'Prénom du contact' },
    { name: '{{lastName}}', description: 'Nom du contact' },
    { name: '{{jobTitle}}', description: 'Titre du poste recherché' },
    { name: '{{companyName}}', description: 'Nom de l\'entreprise qui recrute' },
    { name: '{{personaTitle}}', description: 'Titre du contact' },
    { name: '{{personaCompany}}', description: 'Entreprise du contact' }
  ];

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[data-message-template="true"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = template.substring(0, start) + variable + template.substring(end);
      onChange(newText);
      
      // Reposition le curseur après la variable insérée
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      onChange(template + variable);
    }
  };

  const placeholderText = `Bonjour {{firstName}},

J'ai vu que vous recherchiez un {{jobTitle}}.

J'ai des candidats que je peux vous présenter si vous êtes toujours en recherche.

Souhaitez-vous en discuter ?`;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium mb-3 block">Template de message</Label>
        
        {/* Boutons de variables compacts */}
        <div className="flex flex-wrap gap-2 mb-4">
          {variables.map((variable) => (
            <Button
              key={variable.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable(variable.name)}
              className="flex items-center gap-1 text-xs h-8 px-3"
              title={variable.description}
            >
              <Plus className="h-3 w-3" />
              {variable.name}
            </Button>
          ))}
        </div>

        <Textarea
          data-message-template="true"
          placeholder={placeholderText}
          value={template}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] resize-y"
        />
      </div>
    </div>
  );
};
