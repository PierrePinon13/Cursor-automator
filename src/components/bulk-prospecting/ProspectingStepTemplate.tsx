
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageTemplate } from '@/components/search-jobs/MessageTemplate';
import { Badge } from '@/components/ui/badge';
import { FileText, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { JobData } from '@/types/jobSearch';

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
  const defaultTemplate = `Bonjour {{firstName}},

J'ai vu votre annonce pour le poste de {{jobTitle}} chez {{companyName}}. 

Votre profil correspond parfaitement à ce que nous recherchons pour nos clients. J'aimerais vous présenter une opportunité qui pourrait vous intéresser.

Êtes-vous disponible pour un échange rapide cette semaine ?

Cordialement`;

  // Fonction pour remplacer les variables dans l'aperçu
  const generatePreview = (templateText: string) => {
    if (!templateText || typeof templateText !== 'string') {
      return 'Template invalide';
    }

    return templateText
      .replace(/\{\{firstName\}\}/g, 'Marie')
      .replace(/\{\{lastName\}\}/g, 'Dupont')
      .replace(/\{\{jobTitle\}\}/g, jobData?.title || 'Poste recherché')
      .replace(/\{\{companyName\}\}/g, jobData?.company || 'Entreprise')
      .replace(/\{\{personaTitle\}\}/g, 'Directrice RH')
      .replace(/\{\{personaCompany\}\}/g, 'TechCorp');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Template de message <span className="text-red-500 text-lg">*</span>
          <span className="ml-2 text-xs text-gray-500 font-normal">Ce template sera utilisé comme base pour tous les messages. Vous pourrez personnaliser chaque message individuellement à l'étape suivante.</span>
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">
            {jobData?.title || 'Titre non disponible'}
          </Badge>
          <Badge variant="outline">
            {jobData?.company || 'Entreprise non disponible'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Zone de composition du message, UI améliorée */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label htmlFor="bulk-message-template" className="block text-sm font-semibold text-blue-900 mb-2">Message LinkedIn *</label>
          <MessageTemplate
            template={template || defaultTemplate}
            onChange={onTemplateChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};
