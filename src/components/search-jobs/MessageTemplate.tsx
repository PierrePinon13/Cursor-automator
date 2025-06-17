
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MessageTemplateProps {
  template: string;
  onChange: (template: string) => void;
}

export const MessageTemplate = ({ template, onChange }: MessageTemplateProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Template de message personnalisé</Label>
      <Textarea
        placeholder="Bonjour [PRENOM],

J'ai vu votre annonce pour le poste de [POSTE] chez [ENTREPRISE]. 
Votre profil correspond parfaitement à ce que nous recherchons...

Variables disponibles: [PRENOM], [NOM], [POSTE], [ENTREPRISE]"
        value={template}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px] resize-none"
      />
      <p className="text-sm text-gray-500">
        Personnalisez votre message avec les variables disponibles. Laissez vide pour utiliser le template par défaut.
      </p>
    </div>
  );
};
