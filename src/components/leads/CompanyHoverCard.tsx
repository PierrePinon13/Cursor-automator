
import React from 'react';
import { Building, Users, MapPin, Globe, ExternalLink } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';

interface CompanyHoverCardProps {
  companyId?: string;
  companyLinkedInId?: string;
  companyName: string;
  children: React.ReactNode;
}

const CompanyHoverCard = ({ companyId, companyLinkedInId, companyName, children }: CompanyHoverCardProps) => {
  const { data: company, isLoading } = useCompanyInfo({
    companyId,
    companyLinkedInId,
    companyName,
  });

  const handleClick = () => {
    if (company?.linkedin_id) {
      window.open(`https://www.linkedin.com/company/${company.linkedin_id}`, '_blank');
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="cursor-pointer underline decoration-dotted hover:text-blue-600" onClick={handleClick}>
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm">Chargement...</span>
          </div>
        ) : company ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-sm">{company.name}</h4>
              {company.linkedin_id && (
                <ExternalLink className="h-3 w-3 text-blue-600 ml-auto" />
              )}
            </div>
            {company.description && (
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{company.description}</p>
            )}
            <div className="grid grid-cols-1 gap-2 text-xs">
              {company.industry && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{company.industry}</Badge>
                </div>
              )}
              {company.company_size && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-3 w-3" />
                  <span>{company.company_size}</span>
                </div>
              )}
              {company.headquarters && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-3 w-3" />
                  <span>{company.headquarters}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe className="h-3 w-3" />
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 underline">
                    Site web
                  </a>
                </div>
              )}
              {!!company.follower_count && company.follower_count > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-3 w-3" />
                  <span>{company.follower_count.toLocaleString()} abonnés</span>
                </div>
              )}
            </div>
            {company.linkedin_id && (
              <div className="text-xs text-gray-400 border-t pt-2">
                LinkedIn ID: {company.linkedin_id}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h4 className="font-medium text-sm mb-1">{companyName}</h4>
            <p className="text-xs text-gray-500 mb-3">
              Aucune information détaillée disponible pour cette entreprise.
            </p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

export default CompanyHoverCard;
