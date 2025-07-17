import React from 'react';
import CompanyHoverCard from '@/components/leads/CompanyHoverCard';
import { Linkedin } from 'lucide-react';

interface BulkProspectingLeadCardProps {
  personas: any[];
  selectedPersonas: string[];
  onAcceptPersona: (persona: any) => void;
  onRejectPersona: (persona: any) => void;
}

export const BulkProspectingLeadCard: React.FC<BulkProspectingLeadCardProps> = ({ personas, selectedPersonas, onAcceptPersona, onRejectPersona }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {personas.map((p) => {
        const fullName = (p.first_name || p.name || '') + (p.last_name ? ' ' + p.last_name : '');
        const companyLinkedinUrl = p.company_linkedin_id ? `https://www.linkedin.com/company/${p.company_linkedin_id}` : '';
        const isSelected = selectedPersonas.includes(p.id);
        return (
          <div
            key={p.id}
            className={`relative group p-0 border rounded-2xl flex flex-col min-h-[240px] shadow-lg pb-16 overflow-hidden transition-all duration-200 bg-white border-gray-200 hover:shadow-2xl ${isSelected ? 'border-4 border-green-600 ring-2 ring-green-100 bg-green-50' : ''}`}
          >
            {/* Badge sélectionné */}
            {isSelected && (
              <span className="absolute top-3 right-3 z-20 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">Sélectionné</span>
            )}
            {/* Section Lead */}
            <div className="p-4 pb-2 flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-gray-900 truncate flex items-center gap-1">
                  {fullName}
                </span>
                {p.profile_url || p.author_profile_url ? (
                  <a
                    href={p.profile_url || p.author_profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 hover:text-blue-800 flex-shrink-0"
                    title="Voir le profil LinkedIn"
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                    tabIndex={0}
                  >
                    <Linkedin className="inline h-4 w-4 align-middle" />
                  </a>
                ) : null}
              </div>
              <div className="text-sm text-gray-700 font-medium truncate">{p.company_position || p.title || ''}</div>
              {/* Entreprise + hover + LinkedIn */}
              <div className="flex items-center gap-2 mb-1">
                {p.company && (
                  <CompanyHoverCard
                    companyId={p.company_id}
                    companyLinkedInId={p.company_linkedin_id}
                    companyName={p.company}
                    showLogo={true}
                  >
                    <span className="text-xs text-gray-700 font-semibold hover:underline cursor-pointer truncate max-w-[120px]">
                      {p.company}
                    </span>
                  </CompanyHoverCard>
                )}
                {companyLinkedinUrl && (
                  <a
                    href={companyLinkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                    title="Voir la page LinkedIn de l'entreprise"
                    tabIndex={0}
                  >
                    <Linkedin className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="p-4 pt-2 bg-gray-50 flex-1 flex flex-col justify-between">
              {p.jobTitle && (
                <div className="text-xs text-gray-700 mb-1 truncate font-medium">{p.jobTitle}</div>
              )}
              <div className="text-xs text-gray-500 mb-2 truncate flex items-center gap-1">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" className="inline-block mr-1 text-gray-400"><path d="M12 2C7.03 2 3 6.03 3 11c0 5.25 7.2 10.53 8.13 11.19.53.37 1.21.37 1.74 0C13.8 21.53 21 16.25 21 11c0-4.97-4.03-9-9-9Zm0 17.88C9.09 17.07 5 13.61 5 11c0-3.87 3.13-7 7-7s7 3.13 7 7c0 2.61-4.09 6.07-7 8.88ZM12 6.5A2.5 2.5 0 0 0 9.5 9c0 1.38 1.12 2.5 2.5 2.5S14.5 10.38 14.5 9A2.5 2.5 0 0 0 12 6.5Zm0 3A.5.5 0 1 1 12 8a.5.5 0 0 1 0 1.5Z" fill="currentColor"/></svg>
                {p.location || p.openai_step2_localisation || 'France'}
              </div>
            </div>
            {/* Boutons croix/tick */}
            <div className="absolute bottom-4 left-0 w-full flex justify-center gap-6 z-10">
              <button
                className="rounded-full border border-gray-300 bg-white h-12 w-12 flex items-center justify-center text-gray-400 text-2xl shadow hover:bg-gray-100 transition"
                onClick={() => onRejectPersona(p)}
                title="Rejeter ce profil"
                type="button"
              >
                ✗
              </button>
              <button
                className="rounded-full border border-blue-500 bg-white h-12 w-12 flex items-center justify-center text-blue-500 text-2xl shadow hover:bg-blue-50 transition"
                onClick={() => onAcceptPersona(p)}
                title="Accepter ce profil"
                type="button"
              >
                ✓
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}; 