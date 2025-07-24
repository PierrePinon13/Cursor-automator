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
    card: 'bg-gradient-to-br from-blue-50/80 to-blue-100/60 border-blue-200/60',
    header: 'bg-gradient-to-r from-blue-100/80 to-blue-50/60 border-blue-200/60',
    badge: 'bg-blue-100/80 text-blue-800 border-blue-200/60'
  },
  'Business': {
    card: 'bg-gradient-to-br from-green-50/80 to-green-100/60 border-green-200/60',
    header: 'bg-gradient-to-r from-green-100/80 to-green-50/60 border-green-200/60',
    badge: 'bg-green-100/80 text-green-800 border-green-200/60'
  },
  'Product': {
    card: 'bg-gradient-to-br from-purple-50/80 to-purple-100/60 border-purple-200/60',
    header: 'bg-gradient-to-r from-purple-100/80 to-purple-50/60 border-purple-200/60',
    badge: 'bg-purple-100/80 text-purple-800 border-purple-200/60'
  },
  'Executive Search': {
    card: 'bg-gradient-to-br from-red-50/80 to-red-100/60 border-red-200/60',
    header: 'bg-gradient-to-r from-red-100/80 to-red-50/60 border-red-200/60',
    badge: 'bg-red-100/80 text-red-800 border-red-200/60'
  },
  'Comptelio': {
    card: 'bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 border-yellow-200/60',
    header: 'bg-gradient-to-r from-yellow-100/80 to-yellow-50/60 border-yellow-200/60',
    badge: 'bg-yellow-100/80 text-yellow-800 border-yellow-200/60'
  },
  'RH': {
    card: 'bg-gradient-to-br from-pink-50/80 to-pink-100/60 border-pink-200/60',
    header: 'bg-gradient-to-r from-pink-100/80 to-pink-50/60 border-pink-200/60',
    badge: 'bg-pink-100/80 text-pink-800 border-pink-200/60'
  },
  'Freelance': {
    card: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/60 border-indigo-200/60',
    header: 'bg-gradient-to-r from-indigo-100/80 to-indigo-50/60 border-indigo-200/60',
    badge: 'bg-indigo-100/80 text-indigo-800 border-indigo-200/60'
  },
  'Data': {
    card: 'bg-gradient-to-br from-teal-50/80 to-teal-100/60 border-teal-200/60',
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
  validated?: boolean;
}

export const LeadSelectionCard: React.FC<LeadSelectionCardProps> = ({ lead, isMobile, onClick, onAccept, onReject, validated }) => {
  const title = lead.openai_step3_postes_selectionnes?.join(' / ') || '';
  let titleFontSize = 'text-base';
  let clampClass = '';
  if (title.length > 40) titleFontSize = 'text-sm';
  if (title.length > 60) titleFontSize = 'text-xs';
  if (title.length > 80) { titleFontSize = 'text-[0.625rem]'; }
  if (title.length > 100) { clampClass = 'line-clamp-2 break-words'; }

  // Récupérer les couleurs de la catégorie
  const colors = categoryColors[lead.openai_step3_categorie as keyof typeof categoryColors] || {
    card: 'bg-gradient-to-br from-gray-50/80 to-gray-100/60 border-gray-200/60',
    header: 'bg-gradient-to-r from-gray-100/80 to-gray-50/60 border-gray-200/60',
    badge: 'bg-gray-100/80 text-gray-800 border-gray-200/60'
  };

  return (
    <div className="relative">
      {validated && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl border-2 border-blue-500" style={{boxSizing: 'border-box'}} />
      )}
      <div
        className={`lead-card group flex flex-col h-[477px] w-full font-sans rounded-2xl transition-all duration-200 
          ${colors.card}
          ${lead.selected ? 'ring-2 ring-primary shadow-lg scale-[0.99]' : 'ring-1 ring-gray-200/60 hover:ring-gray-300/80'}
          ${lead.selected ? 'after:absolute after:inset-0 after:bg-primary/5 after:rounded-2xl' : ''}`}
        onClick={onClick}
        style={{ isolation: 'isolate', ...isMobile ? { touchAction: 'manipulation' } : undefined }}
      >
        {/* Header avec infos du lead */}
        <div className={`shrink-0 w-full px-4 pt-2 pb-1.5 flex flex-col gap-1 items-start rounded-t-2xl border-b border-gray-200/30 relative`} style={{ zIndex: 30 }}>
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
            <div className="relative w-full" style={{ zIndex: 40 }}>
            <CompanyHoverCard 
              companyId={lead.company_id}
              companyLinkedInId={lead.company_linkedin_id}
              companyName={lead.unipile_company || lead.company_name}
              showLogo={true}
            >
                <div className="text-xs text-gray-700 line-clamp-1 break-words pr-2">
                {lead.unipile_company || lead.company_name}
              </div>
            </CompanyHoverCard>
            </div>
          ) : null}
        </div>

        {/* Titre du poste recherché */}
        <div className={`shrink-0 px-4 py-1.5 font-medium text-sm text-gray-900 h-[2.75rem] flex items-center border-b border-gray-200/30 relative`} style={{ zIndex: 20 }}>
          <div className="line-clamp-2">{title}</div>
        </div>

        {/* Texte du post LinkedIn */}
        <div className="relative flex-1 px-0.5 py-2.5 text-xs text-gray-600 linkedin-post-text" style={{ zIndex: 10, minHeight: 0 }}>
          <div className="overflow-y-auto max-h-full pb-10">
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
          {lead.url && (
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="absolute bottom-2 right-2 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 group shadow-md"
              style={{zIndex: 20, background: 'linear-gradient(90deg, #f0f6ff 60%, #e0e7ef 100%)'}}
            >
              <span>Voir sur LinkedIn</span>
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              >
                <path d="M7 17L17 7"/>
                <path d="M7 7h10v10"/>
              </svg>
            </a>
          )}
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
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-9 flex items-center gap-6 z-50">
          {onReject && (
            <button
              type="button"
              aria-label="Rejeter"
              className="w-[45px] h-[45px] flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm shadow-md hover:bg-gray-100 border border-gray-200/70 hover:border-gray-300 text-gray-500 transition-all duration-200 z-50"
              onClick={e => { e.stopPropagation(); onReject(lead); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
          {onAccept && (
            <button
              type="button"
              aria-label="Valider"
              className="w-[45px] h-[45px] flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm shadow-md hover:bg-blue-100 border border-blue-200/70 hover:border-blue-400 text-blue-600 transition-all duration-200 z-50"
              onClick={e => { e.stopPropagation(); onAccept(lead); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 10 18 4 12"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 