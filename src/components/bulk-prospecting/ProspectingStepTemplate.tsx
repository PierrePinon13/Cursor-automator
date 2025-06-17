
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageTemplate } from '@/components/search-jobs/MessageTemplate';
import { Badge } from '@/components/ui/badge';
import { FileText, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JobData {
  id: string;
  title: string;
  company: string;
  personas: any[];
}

interface ProspectingStepTemplateProps {
  jobData: JobData;
  template: string;
  onTemplateChange: (template: string) => void;
}

export const ProspectingStepTemplate = ({ 
  jobData, 
  template, 
  onTemplateChange 
}: ProspectingStepTemplateProps) => {
  const defaultTemplate = `Bonjour [PRENOM],

J'ai vu votre annonce pour le poste de [POSTE] chez [ENTREPRISE]. 

Votre profil correspond parfaitement à ce que nous recherchons pour nos clients. J'aimerais vous présenter une opportunité qui pourrait vous intéresser.

Êtes-vous disponible pour un échange rapide cette semaine ?

Cordialement`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Template de message
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {jobData.title}
          </Badge>
          <Badge variant="outline">
            {jobData.company}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Ce template sera utilisé comme base pour tous les messages. Vous pourrez personnaliser 
            chaque message individuellement à l'étape suivante.
            <br /><br />
            Variables disponibles : [PRENOM], [NOM], [POSTE], [ENTREPRISE], [TITRE_PERSONA], [ENTREPRISE_PERSONA]
          </AlertDescription>
        </Alert>

        <MessageTemplate
          template={template || defaultTemplate}
          onChange={onTemplateChange}
        />

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Aperçu avec des variables remplies :</h4>
          <div className="text-sm text-gray-700 whitespace-pre-wrap border-l-4 border-blue-500 pl-4">
            {(template || defaultTemplate)
              .replace(/\[PRENOM\]/g, 'Marie')
              .replace(/\[NOM\]/g, 'Dupont')
              .replace(/\[POSTE\]/g, jobData.title)
              .replace(/\[ENTREPRISE\]/g, jobData.company)
              .replace(/\[TITRE_PERSONA\]/g, 'Directrice RH')
              .replace(/\[ENTREPRISE_PERSONA\]/g, 'TechCorp')
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
