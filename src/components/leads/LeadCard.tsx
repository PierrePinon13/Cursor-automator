
import React from 'react';
import { ExternalLink, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTimeAgo } from '@/utils/timeUtils';
import { Tables } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';

type Lead = Tables<'leads'>;

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

interface LeadCardProps {
  lead: Lead;
  isMobile: boolean;
  onClick: (event: React.MouseEvent) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, isMobile, onClick }) => {
  const colors = categoryColors[lead.openai_step3_categorie as keyof typeof categoryColors] || {
    card: 'bg-gradient-to-br from-gray-50/80 to-gray-100/60 border-gray-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-gray-100/80 to-gray-50/60 border-gray-200/60',
    badge: 'bg-gray-100/80 text-gray-800 border-gray-200/60'
  };

  const postesCount = lead.openai_step3_postes_selectionnes?.length || 0;
  const fontSizeClass = postesCount > 2 ? (isMobile ? 'text-xs' : 'text-sm') : (isMobile ? 'text-base' : 'text-xl');

  return (
    <div
      className={`
        ${colors.card} rounded-xl border shadow-sm transition-all duration-300
        overflow-hidden flex flex-col
        ${isMobile
          ? "min-h-[160px] active:scale-[0.97] touch-manipulation"
          : "min-h-[220px] hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
        }
      `}
      onClick={onClick}
      style={isMobile ? { touchAction: 'manipulation' } : undefined}
    >
      {/* Header */}
      <div className={`
        ${colors.header} border-b min-h-[56px] flex items-center justify-between flex-shrink-0 backdrop-blur-sm
        ${isMobile ? "p-3" : "p-4"}
      `}>
        <div className="flex-1 flex flex-col min-h-0 justify-center">
          {lead.openai_step3_postes_selectionnes?.length ? (
            <div className={`font-bold leading-tight ${fontSizeClass} mb-1 truncate`} style={{
              color: colors.badge.includes('text-') && colors.badge.split(' ').find((c:string) => c.startsWith('text-')),
              textShadow: '0 1px 2px rgba(0,0,0,0.07)'
            }}>
              {lead.openai_step3_postes_selectionnes.join(' / ')}
            </div>
          ) : null}
        </div>
        <div className="ml-2 flex-shrink-0">
          <Badge
            variant="secondary"
            className={`text-xs px-2 py-1 ${colors.badge} border font-semibold backdrop-blur-sm`}
            style={isMobile ? { fontSize: 12, padding: '3px 8px' } : undefined}
          >
            {lead.openai_step3_categorie}
          </Badge>
        </div>
      </div>

      {/* Central Section */}
      <div className={`flex-1 bg-white/20 backdrop-blur-sm ${isMobile ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}>
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-gray-900 ${isMobile ? "text-xs" : "text-sm"}`}>
            {lead.author_name || 'N/A'}
          </span>
          {lead.author_profile_url && (
            <a
              href={lead.author_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              data-clickable="true"
              onClick={(e) => e.stopPropagation()}
              className={`p-2 rounded-lg bg-blue-50/60 hover:bg-blue-100/60 transition-all duration-200 ${isMobile ? '' : 'hover:scale-110'}`}
              style={isMobile ? { fontSize: 18 } : undefined}
            >
              <Linkedin className="h-4 w-4 text-blue-600" />
            </a>
          )}
        </div>
        {(lead.unipile_position || lead.company_position) && (
          <div className={`${isMobile ? "text-xs" : "text-sm"} text-gray-700 font-medium bg-white/40 px-3 py-1 rounded-lg`}>
            {lead.unipile_position || lead.company_position}
          </div>
        )}
        {lead.unipile_company || lead.company_name ? (
          <div
            className="text-blue-700 hover:text-blue-800 hover:underline cursor-pointer text-sm font-semibold transition-colors bg-blue-50/40 px-3 py-2 rounded-lg"
            data-clickable="true"
            onClick={(e) => {
              e.stopPropagation();
              if (lead.author_profile_url) window.open(lead.author_profile_url, '_blank');
            }}
            style={isMobile ? { fontSize: 13 } : undefined}
          >
            {lead.unipile_company || lead.company_name}
          </div>
        ) : (
          <div className="text-amber-600 text-xs font-medium bg-amber-50/40 px-3 py-2 rounded-lg">
            Données non disponibles
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`bg-white/30 backdrop-blur-sm px-4 py-3 border-t border-gray-200/40 flex-shrink-0`}>
        <div className={`flex items-center justify-between text-xs text-gray-700 ${isMobile ? 'text-[10px]' : ''}`}>
          <span className="font-medium bg-white/40 px-2 py-1 rounded">
            Posté {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
          </span>
          <span className="font-semibold bg-emerald-50/60 text-emerald-700 px-2 py-1 rounded">
            {lead.openai_step2_localisation || 'France'}
          </span>
        </div>
      </div>
    </div>
  );
};
