import React from 'react';
import { Linkedin } from 'lucide-react';
import { getTimeAgo } from '@/utils/timeUtils';
import { Tables } from '@/integrations/supabase/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CompanyHoverCard from './CompanyHoverCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './LeadSelectionCard.css';

// Type LeadSelectionLead pour expliciter l'usage dans la sélection
// (identique à Lead pour l'instant)
type LeadSelectionLead = Tables<'leads'> & {
  companies?: Tables<'companies'>;
  selected?: boolean;
};

// Couleurs par catégorie de métier
const categoryColors = {
  'Tech': {
    card: 'bg-gradient-to-br from-blue-50/80 to-blue-100/60 border-blue-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-blue-100/80 to-blue-50/60 border-blue-200/60',
    badge: 'bg-blue-100/80 text-blue-800 border-blue-200/60'
  },
  'Business': {
    card: 'bg-gradient-to-br from-green-50/80 to-green-100/60 border-green-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-green-100/80 to-green-50/60 border-green-200/60',
    badge: 'bg-green-100/80 text-green-800 border-green-200/60'
  },
  'Product': {
    card: 'bg-gradient-to-br from-purple-50/80 to-purple-100/60 border-purple-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-purple-100/80 to-purple-50/60 border-purple-200/60',
    badge: 'bg-purple-100/80 text-purple-800 border-purple-200/60'
  },
  'Executive Search': {
    card: 'bg-gradient-to-br from-red-50/80 to-red-100/60 border-red-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-red-100/80 to-red-50/60 border-red-200/60',
    badge: 'bg-red-100/80 text-red-800 border-red-200/60'
  },
  'Comptelio': {
    card: 'bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 border-yellow-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-yellow-100/80 to-yellow-50/60 border-yellow-200/60',
    badge: 'bg-yellow-100/80 text-yellow-800 border-yellow-200/60'
  },
  'RH': {
    card: 'bg-gradient-to-br from-pink-50/80 to-pink-100/60 border-pink-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-pink-100/80 to-pink-50/60 border-pink-200/60',
    badge: 'bg-pink-100/80 text-pink-800 border-pink-200/60'
  },
  'Freelance': {
    card: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/60 border-indigo-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-indigo-100/80 to-indigo-50/60 border-indigo-200/60',
    badge: 'bg-indigo-100/80 text-indigo-800 border-indigo-200/60'
  },
  'Data': {
    card: 'bg-gradient-to-br from-teal-50/80 to-teal-100/60 border-teal-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-teal-100/80 to-teal-50/60 border-teal-200/60',
    badge: 'bg-teal-100/80 text-teal-800 border-teal-200/60'
  }
};

interface LeadSelectionCardProps {
  lead: LeadSelectionLead;
  isMobile: boolean;
  onClick: (event: React.MouseEvent) => void;
  onAccept?: (lead: LeadSelectionLead) => void;
  onReject?: (lead: LeadSelectionLead) => void;
}

export const LeadSelectionCard: React.FC<LeadSelectionCardProps> = ({ lead, isMobile, onClick, onAccept, onReject }) => {
  const title = lead.openai_step3_postes_selectionnes?.join(' / ') || '';
  let titleFontSize = 'text-base';
  let clampClass = '';
  if (title.length > 40) titleFontSize = 'text-sm';
  if (title.length > 60) titleFontSize = 'text-xs';
  if (title.length > 80) { titleFontSize = 'text-[0.625rem]'; }
  if (title.length > 100) { clampClass = 'line-clamp-2 break-words'; }

  // Récupérer les couleurs de la catégorie
  const colors = categoryColors[lead.openai_step3_categorie as keyof typeof categoryColors] || {
    card: 'bg-gradient-to-br from-gray-50/80 to-gray-100/60 border-gray-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-gray-100/80 to-gray-50/60 border-gray-200/60',
    badge: 'bg-gray-100/80 text-gray-800 border-gray-200/60'
  };

  return (
    <div className="relative">
      <div
        className={`group flex flex-col h-[477px] w-full font-sans rounded-2xl transition-all duration-200 
          ${colors.card}
          ${lead.selected ? 'ring-2 ring-primary shadow-lg scale-[0.99]' : 'ring-1 ring-gray-200/60 hover:ring-gray-300/80'}
          ${lead.selected ? 'after:absolute after:inset-0 after:bg-primary/5 after:rounded-2xl' : ''}`}
        onClick={onClick}
        style={isMobile ? { touchAction: 'manipulation' } : undefined}
      >
        {/* Header avec infos du lead */}
        <div className={`shrink-0 w-full px-4 pt-2 pb-1.5 flex flex-col gap-1 items-start rounded-t-2xl ${colors.card} border-b border-gray-200/30`}>
          <div className="flex items-center gap-2 w-full">
            <span className="font-semibold text-xs text-gray-900 truncate max-w-[200px]">{lead.author_name || 'N/A'}</span>
            {lead.author_profile_url && (
              <a
                href={lead.author_profile_url}
                target="_blank"
                rel="noopener noreferrer"
                data-clickable="true"
                onClick={e => e.stopPropagation()}
                className="p-1 rounded-lg bg-blue-50/60 hover:bg-blue-100/60 transition-all duration-200"
              >
                <Linkedin className="h-3 w-3 text-blue-600" />
              </a>
            )}
          </div>
          {lead.unipile_position || lead.company_position ? (
            <div className="text-xs text-gray-700 font-normal truncate w-full">
              {lead.unipile_position || lead.company_position}
            </div>
          ) : null}
          {lead.unipile_company || lead.company_name ? (
            <CompanyHoverCard 
              companyId={lead.company_id}
              companyLinkedInId={lead.company_linkedin_id}
              companyName={lead.unipile_company || lead.company_name}
              showLogo={true}
            >
              <div className="text-xs text-gray-700 line-clamp-1 break-words">
                {lead.unipile_company || lead.company_name}
              </div>
            </CompanyHoverCard>
          ) : null}
        </div>

        {/* Titre du poste recherché */}
        <div className={`shrink-0 px-4 py-1.5 font-medium text-sm text-gray-900 ${colors.card} h-[2.75rem] flex items-center border-b border-gray-200/30`}>
          <div className="line-clamp-2">{title}</div>
        </div>

        {/* Texte du post LinkedIn */}
        <div className="flex-1 px-0.5 py-2.5 text-xs text-gray-600 overflow-y-auto linkedin-post-text">
          <div className="max-w-full prose prose-sm prose-gray prose-p:mr-0.5 prose-p:last:mr-0">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({node, ...props}) => <p className="whitespace-pre-wrap mb-2 pr-0.5 last:pr-0" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
                ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 pr-0.5" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 pr-0.5" {...props} />,
                li: ({node, ...props}) => <li className="mb-1 pr-0.5 last:pr-0" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                em: ({node, ...props}) => <em className="italic" {...props} />,
                br: ({node, ...props}) => <br className="mb-2" {...props} />,
              }}
            >
              {lead.text || ''}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer avec boutons */}
        <div
          className={`shrink-0 relative flex items-center justify-between gap-2 px-3 py-2 ${colors.card} text-xs min-h-[36px] border-t border-gray-200/30 rounded-b-2xl`}
        >
          <span className={`font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
            Posté {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
          </span>
        </div>
      </div>

      {/* Boutons d'action en dehors du conteneur principal */}
      {(onAccept || onReject) && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-9 flex items-center gap-6">
          {onReject && (
            <button
              type="button"
              aria-label="Rejeter"
              className="w-[45px] h-[45px] flex items-center justify-center rounded-full bg-white/30 backdrop-blur-sm shadow-md hover:bg-red-50/90 border border-gray-200/50 hover:border-red-200/90 hover:text-red-600 transition-all duration-200 z-10 group"
              onClick={e => { e.stopPropagation(); onReject(lead); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-60 group-hover:opacity-100 transition-opacity"><path d="M6 6l12 12M18 6l-12 12"/></svg>
            </button>
          )}
          {onAccept && (
            <button
              type="button"
              aria-label="Accepter"
              className="w-[45px] h-[45px] flex items-center justify-center rounded-full bg-white/50 backdrop-blur-sm shadow-md hover:scale-105 hover:bg-green-50/90 border border-gray-200/50 hover:border-green-200/90 hover:text-green-600 transition-all duration-300 z-10 group"
              onClick={e => { e.stopPropagation(); onAccept(lead); }}
            >
              <div className="relative w-6 h-6">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  className="absolute inset-0 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110"
                >
                  <path d="M4 12l6 6L20 6" className="group-hover:stroke-[3]"/>
                </svg>
                <div className="absolute inset-0 bg-green-400/0 group-hover:bg-green-400/10 rounded-full transition-all duration-300 group-hover:scale-150"/>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 