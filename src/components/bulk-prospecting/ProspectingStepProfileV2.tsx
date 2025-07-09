import React from 'react';
import CompanyHoverCard from '@/components/leads/CompanyHoverCard';

export interface Lead {
  id: string;
  first_name: string;
  company_name: string;
  company_position: string;
  openai_step3_postes_selectionnes: string[];
  text: string;
  company_logo?: string;
  company_id?: string;
  company_linkedin_id?: string;
}

interface ProspectingStepProfileV2Props {
  leads: Lead[];
  onAccept: (lead: Lead) => void;
  onReject: (lead: Lead) => void;
}

export const ProspectingStepProfileV2: React.FC<ProspectingStepProfileV2Props> = ({ leads, onAccept, onReject }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="relative p-4 border rounded-xl bg-white flex flex-col min-h-[360px] shadow-sm pb-20"
        >
          {/* En-tête entreprise avec logo et hover */}
          <div className="flex items-center gap-2 mb-2">
            {lead.company_logo && (
              <img
                src={lead.company_logo}
                alt={lead.company_name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 bg-white"
              />
            )}
            <CompanyHoverCard
              companyId={lead.company_id}
              companyLinkedInId={lead.company_linkedin_id}
              companyName={lead.company_name}
              showLogo={false}
            >
              <span className="text-xs text-gray-700 font-semibold hover:underline cursor-pointer truncate max-w-[120px]">
                {lead.company_name}
              </span>
            </CompanyHoverCard>
          </div>
          {/* Nom du contact + titre du contact */}
          <div className="flex items-center justify-between mb-1">
            <div className="text-lg font-bold text-blue-700 truncate">{lead.first_name}</div>
            <div className="text-xs text-gray-500 truncate">{lead.company_position}</div>
          </div>
          {/* Postes recherchés */}
          {Array.isArray(lead.openai_step3_postes_selectionnes) && lead.openai_step3_postes_selectionnes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {lead.openai_step3_postes_selectionnes.map((poste, idx) => (
                <span key={idx} className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full truncate max-w-[120px]">{poste}</span>
              ))}
            </div>
          )}
          {/* Contenu du post LinkedIn */}
          <div className="bg-gray-50 rounded p-2 text-sm text-gray-800 max-h-32 overflow-y-auto mb-2 whitespace-pre-line">
            {lead.text}
          </div>
          {/* Boutons croix/tick */}
          <div className="absolute bottom-4 left-0 w-full flex justify-center gap-6 z-10">
            <button
              className="rounded-full border border-gray-300 bg-white h-12 w-12 flex items-center justify-center text-gray-400 text-2xl shadow hover:bg-gray-100 transition"
              onClick={() => onReject(lead)}
              title="Rejeter ce lead"
              type="button"
            >
              ✗
            </button>
            <button
              className="rounded-full border border-blue-500 bg-white h-12 w-12 flex items-center justify-center text-blue-500 text-2xl shadow hover:bg-blue-50 transition"
              onClick={() => onAccept(lead)}
              title="Accepter ce lead"
              type="button"
            >
              ✓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}; 