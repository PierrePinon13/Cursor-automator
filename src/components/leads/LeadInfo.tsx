
import React from 'react';
import { ExternalLink, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Lead {
  author_name: string;
  author_profile_url: string;
  author_headline: string;
  unipile_company: string;
  unipile_position: string;
  openai_step3_postes_selectionnes: string[];
  text: string;
  url: string;
}

interface LeadInfoProps {
  lead: Lead;
}

const LeadInfo = ({ lead }: LeadInfoProps) => {
  const formatCompanyInfo = () => {
    if (lead.unipile_company && lead.unipile_position) {
      return `${lead.unipile_position} @ ${lead.unipile_company}`;
    } else if (lead.unipile_company) {
      return `@ ${lead.unipile_company}`;
    } else if (lead.unipile_position) {
      return lead.unipile_position;
    } else if (lead.author_headline) {
      return lead.author_headline;
    }
    return 'Informations non disponibles';
  };

  return (
    <div className="space-y-6">
      {/* Prénom nom + logo LinkedIn + infos entreprise */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{lead.author_name || 'N/A'}</h3>
            <div className="text-sm text-gray-600">
              {formatCompanyInfo()}
            </div>
          </div>
          <a
            href={lead.author_profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Linkedin className="h-6 w-6" />
          </a>
        </div>
      </div>

      {/* Poste recherché */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-600">Poste recherché</h4>
        <div className="space-y-1">
          {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
            <Badge key={index} className="bg-green-100 text-green-800 border-green-300">
              {poste}
            </Badge>
          ))}
        </div>
      </div>

      {/* Publication LinkedIn */}
      <div className="space-y-2 flex-1">
        <h4 className="font-medium text-sm text-gray-600">Publication LinkedIn</h4>
        <div className="bg-white p-4 rounded-lg border" style={{ height: '400px' }}>
          <ScrollArea className="h-full">
            <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
              {lead.text}
            </div>
          </ScrollArea>
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mt-2"
          >
            Voir la publication
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LeadInfo;
