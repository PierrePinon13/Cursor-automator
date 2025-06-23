
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Archive, Building2 } from 'lucide-react';
import { ClientJobOffer, User as UserType } from '@/hooks/useClientJobOffers';
import { JobOfferRow } from './JobOfferRow';

interface CompanyGroup {
  companyName: string;
  offers: ClientJobOffer[];
  totalCount: number;
  activeCount: number;
  archivedCount: number;
}

interface CompanyGroupedJobOffersProps {
  jobOffers: ClientJobOffer[];
  users: UserType[];
  onAssignJobOffer: (jobOfferId: string, userId: string | null) => void;
  onUpdateStatus: (jobOfferId: string, status: string) => void;
  onArchiveAllForCompany: (companyName: string) => void;
  animatingItems: Set<string>;
}

export function CompanyGroupedJobOffers({ 
  jobOffers, 
  users, 
  onAssignJobOffer, 
  onUpdateStatus, 
  onArchiveAllForCompany,
  animatingItems 
}: CompanyGroupedJobOffersProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Grouper les offres par entreprise
  const groupedOffers = jobOffers.reduce((groups: Record<string, CompanyGroup>, offer) => {
    const companyName = offer.company_name || 'Entreprise non renseignée';
    
    if (!groups[companyName]) {
      groups[companyName] = {
        companyName,
        offers: [],
        totalCount: 0,
        activeCount: 0,
        archivedCount: 0
      };
    }
    
    groups[companyName].offers.push(offer);
    groups[companyName].totalCount++;
    
    if (offer.status === 'archivee') {
      groups[companyName].archivedCount++;
    } else {
      groups[companyName].activeCount++;
    }
    
    return groups;
  }, {});

  const sortedCompanies = Object.values(groupedOffers).sort((a, b) => {
    // Trier par nombre d'offres actives décroissant, puis par nom
    if (a.activeCount !== b.activeCount) {
      return b.activeCount - a.activeCount;
    }
    return a.companyName.localeCompare(b.companyName);
  });

  const toggleCompanyExpansion = (companyName: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyName)) {
      newExpanded.delete(companyName);
    } else {
      newExpanded.add(companyName);
    }
    setExpandedCompanies(newExpanded);
  };

  const handleArchiveAllForCompany = (companyName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir archiver toutes les offres actives de "${companyName}" ?`)) {
      onArchiveAllForCompany(companyName);
    }
  };

  if (sortedCompanies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Aucune offre d'emploi trouvée</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedCompanies.map((company) => {
        const isExpanded = expandedCompanies.has(company.companyName);
        const hasActiveOffers = company.activeCount > 0;

        return (
          <Card key={company.companyName} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCompanyExpansion(company.companyName)}
                    className="p-1 h-auto"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg font-semibold">
                      {company.companyName}
                    </CardTitle>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {company.activeCount} actives
                    </Badge>
                    {company.archivedCount > 0 && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                        {company.archivedCount} archivées
                      </Badge>
                    )}
                  </div>

                  {hasActiveOffers && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveAllForCompany(company.companyName)}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Archiver tout
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {company.offers.map((offer) => (
                    <JobOfferRow
                      key={offer.id}
                      offer={offer}
                      users={users}
                      onAssignJobOffer={onAssignJobOffer}
                      onUpdateStatus={onUpdateStatus}
                      animatingItems={animatingItems}
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
