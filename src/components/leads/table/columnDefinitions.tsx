
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTimeAgo } from '@/utils/timeUtils';

interface Lead {
  id: string;
  created_at: string;
  author_name: string;
  author_headline: string;
  author_profile_url: string;
  text: string;
  title: string;
  url: string;
  posted_at_iso: string;
  posted_at_timestamp: number;
  openai_step2_localisation: string;
  openai_step3_categorie: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_justification: string;
  unipile_company: string;
  unipile_position: string;
  unipile_profile_scraped: boolean;
  unipile_profile_scraped_at: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
  approach_message?: string | null;
  approach_message_generated?: boolean | null;
  approach_message_generated_at?: string | null;
  is_client_lead?: boolean | null;
  matched_client_name?: string | null;
  matched_client_id?: string | null;
  last_contact_at?: string | null;
  linkedin_message_sent_at?: string | null;
  phone_contact_status?: string | null;
  phone_contact_at?: string | null;
}

export interface Column {
  id: string;
  label: string;
  width?: string;
  minWidth?: string;
  render: (lead: Lead, onRowClick?: (leadIndex: number, event: React.MouseEvent) => void, leadIndex?: number) => React.ReactNode;
}

const categoryColors = {
  'Tech': 'bg-blue-100 border-blue-300 text-blue-800',
  'Business': 'bg-green-100 border-green-300 text-green-800',
  'Product': 'bg-purple-100 border-purple-300 text-purple-800',
  'Executive Search': 'bg-red-100 border-red-300 text-red-800',
  'Comptelio': 'bg-yellow-100 border-yellow-300 text-yellow-800',
  'RH': 'bg-pink-100 border-pink-300 text-pink-800',
  'Freelance': 'bg-indigo-100 border-indigo-300 text-indigo-800',
  'Data': 'bg-teal-100 border-teal-300 text-teal-800'
};

export const allColumns: Column[] = [
  {
    id: 'posted_date',
    label: 'Posted Date',
    width: '77px',
    minWidth: '77px',
    render: (lead) => (
      <span className="text-xs whitespace-nowrap">
        {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
      </span>
    )
  },
  {
    id: 'job_title',
    label: 'Profil recherché',
    width: '108px',
    minWidth: '108px',
    render: (lead) => (
      <div className="w-full h-full flex items-center">
        <div className="flex items-start justify-between gap-2 w-full">
          <div className="flex-1">
            {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
              <div key={index} className="text-green-600 text-xs">
                <span 
                  className="cursor-pointer hover:text-green-700 hover:underline inline-block"
                  data-clickable="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(lead.url, '_blank');
                  }}
                >
                  {poste}
                </span>
                {index < lead.openai_step3_postes_selectionnes.length - 1 && <br />}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'author_name',
    label: 'Lead',
    width: '110px',
    render: (lead) => (
      <div className="w-full h-full flex items-center">
        <div className="flex items-center justify-between gap-2 w-full">
          <span 
            className="font-medium text-xs cursor-pointer hover:text-blue-700 hover:underline transition-colors inline-block"
            data-clickable="true"
            onClick={(e) => {
              e.stopPropagation();
              window.open(lead.author_profile_url, '_blank');
            }}
          >
            {lead.author_name || 'N/A'}
          </span>
        </div>
      </div>
    )
  },
  {
    id: 'company',
    label: 'Entreprise',
    width: '200px',
    render: (lead) => (
      <div className="space-y-1">
        {lead.unipile_company ? (
          <div>
            <div className="font-medium text-xs">{lead.unipile_company}</div>
            {lead.unipile_position && (
              <div className="text-xs text-gray-600">{lead.unipile_position}</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            <div>Données non disponibles</div>
            <div className="text-xs text-gray-400 truncate">{lead.author_headline || 'N/A'}</div>
          </div>
        )}
      </div>
    )
  },
  {
    id: 'last_contact',
    label: 'Dernier contact',
    width: '120px',
    render: (lead) => {
      if (!lead.last_contact_at) {
        return <span className="text-xs text-gray-400">Aucun contact</span>;
      }
      
      return (
        <div className="space-y-1">
          <div className="text-xs text-gray-700">
            {getTimeAgo(lead.last_contact_at)}
          </div>
          {lead.phone_contact_status && (
            <div className={`text-xs px-1 py-0.5 rounded text-center ${
              lead.phone_contact_status === 'positive' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {lead.phone_contact_status === 'positive' ? 'Positif' : 'Négatif'}
            </div>
          )}
        </div>
      );
    }
  },
  {
    id: 'category',
    label: 'Catégorie',
    width: '100px',
    render: (lead) => {
      const colorClass = categoryColors[lead.openai_step3_categorie as keyof typeof categoryColors] || 'bg-gray-100 border-gray-300 text-gray-800';
      return (
        <Badge variant="outline" className={`text-xs px-2 py-0.5 ${colorClass}`}>
          {lead.openai_step3_categorie}
        </Badge>
      );
    }
  },
  {
    id: 'location',
    label: 'Localisation',
    width: '100px',
    render: (lead) => (
      <span className="text-xs">{lead.openai_step2_localisation || 'France'}</span>
    )
  }
];
