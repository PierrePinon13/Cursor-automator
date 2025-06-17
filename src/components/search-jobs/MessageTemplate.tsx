
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

J'ai vu votre annonce pour le poste de {{jobTitle}} chez {{companyName}}. 
Votre profil correspond parfaitement à ce que nous recherchons...

Variables disponibles: {{firstName}}, {{lastName}}, {{jobTitle}}, {{companyName}}, {{personaTitle}}, {{personaCompany}}`;

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Template de message personnalisé</Label>
      
      {/* Boutons de variables */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Variables disponibles :</Label>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable) => (
            <Button
              key={variable.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable(variable.name)}
              className="flex items-center gap-1 text-xs h-7"
              title={variable.description}
            >
              <Plus className="h-3 w-3" />
              {variable.name}
            </Button>
          ))}
        </div>
      </div>

      <Textarea
        data-message-template="true"
        placeholder={placeholderText}
        value={template}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px] resize-none"
      />
      
      <div className="flex flex-wrap gap-1 mt-2">
        {variables.map((variable) => (
          <Badge key={variable.name} variant="secondary" className="text-xs">
            {variable.name}
          </Badge>
        ))}
      </div>
    </div>
  );
};
