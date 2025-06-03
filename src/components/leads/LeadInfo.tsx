
import React from 'react';
import { ExternalLink, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface LeadInfoProps {
  lead: Lead;
}

const LeadInfo = ({ lead }: LeadInfoProps) => {
  console.log('LeadInfo - lead data:', lead);
  console.log('LeadInfo - postes sélectionnés:', lead.openai_step3_postes_selectionnes);
  console.log('LeadInfo - text:', lead.text);
  console.log('LeadInfo - url:', lead.url);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Poste recherché - Mis en avant avec icône */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 shadow-sm border-2 border-green-200 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-600 rounded-lg">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-green-800">Poste recherché</h4>
            <p className="text-xs text-green-700">Postes identifiés par l'IA</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 ? (
            lead.openai_step3_postes_selectionnes.map((poste, index) => (
              <Badge 
                key={index} 
                className="bg-green-600 text-white border-green-700 hover:bg-green-700 transition-colors text-sm px-3 py-1.5 font-medium"
              >
                {poste}
              </Badge>
            ))
          ) : (
            <div className="text-green-700 text-sm font-medium bg-green-100 px-3 py-2 rounded-lg border border-green-200">
              Aucun poste sélectionné
            </div>
          )}
        </div>
      </div>

      {/* Publication LinkedIn - design harmonisé */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 shadow-sm border border-gray-200 flex-1 min-h-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <div className="text-white font-bold text-sm">in</div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">Publication LinkedIn</h4>
            <p className="text-xs text-gray-600">Contenu de la publication</p>
          </div>
        </div>
        <div className="flex flex-col h-[calc(100%-56px)] space-y-3">
          <div className="bg-white rounded-lg p-4 border border-gray-200 flex-1 min-h-0 shadow-sm">
            <ScrollArea className="h-full w-full">
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pr-4">
                {lead.text || 'Aucun texte disponible'}
              </div>
            </ScrollArea>
          </div>
          {lead.url && (
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors flex-shrink-0 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100"
            >
              Voir la publication
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadInfo;
