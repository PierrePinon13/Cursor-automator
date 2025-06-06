
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Calendar, Clock, Crown } from 'lucide-react';
import ClientHistoryAnalyzer from './ClientHistoryAnalyzer';
import CompanyHoverCard from './CompanyHoverCard';

interface LeadWorkHistoryProps {
  lead: any;
}

interface WorkExperience {
  company_name: string;
  position: string;
  duration_months?: number;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  linkedin_id?: string;
  linkedin_url?: string;
  is_client?: boolean;
}

export function LeadWorkHistory({ lead }: LeadWorkHistoryProps) {
  if (!lead) {
    return null;
  }

  // Extraire l'historique professionnel des nouvelles colonnes
  const workHistory: WorkExperience[] = [];
  
  for (let i = 1; i <= 5; i++) {
    const companyName = lead[`company_${i}_name`];
    const position = lead[`company_${i}_position`];
    
    if (companyName && position) {
      // Vérifier si cette entreprise est dans previous_client_companies
      const isClient = lead.previous_client_companies?.some((clientCompany: any) => {
        if (typeof clientCompany === 'string') {
          return clientCompany.toLowerCase() === companyName.toLowerCase();
        }
        return clientCompany.client_name?.toLowerCase() === companyName.toLowerCase() ||
               clientCompany.company_name?.toLowerCase() === companyName.toLowerCase();
      }) || false;
      
      workHistory.push({
        company_name: companyName,
        position: position,
        duration_months: lead[`company_${i}_duration_months`],
        start_date: lead[`company_${i}_start_date`],
        end_date: lead[`company_${i}_end_date`],
        is_current: lead[`company_${i}_is_current`] || false,
        linkedin_id: lead[`company_${i}_linkedin_id`],
        linkedin_url: lead[`company_${i}_linkedin_url`],
        is_client: isClient
      });
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Présent';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDuration = (months: number | null) => {
    if (!months) return '';
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${remainingMonths} mois`;
    } else if (remainingMonths === 0) {
      return `${years} an${years > 1 ? 's' : ''}`;
    } else {
      return `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois`;
    }
  };

  if (workHistory.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Historique professionnel ({workHistory.length})
            {lead.has_previous_client_company && (
              <Badge variant="default" className="bg-blue-600 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Client précédent
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workHistory.map((experience, index) => (
            <div key={index} className={`border rounded-lg p-4 space-y-2 ${
              experience.is_client ? 'border-blue-500 bg-blue-50' : ''
            }`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{experience.position}</h4>
                    {experience.is_client && (
                      <Badge variant="default" className="bg-blue-600 text-white text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        Client
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CompanyHoverCard 
                      companyLinkedInId={experience.linkedin_id}
                      companyName={experience.company_name}
                    >
                      <span className="text-sm text-muted-foreground">
                        {experience.company_name}
                      </span>
                    </CompanyHoverCard>
                    {experience.linkedin_url && (
                      <a 
                        href={experience.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                  {experience.linkedin_id && (
                    <p className="text-xs text-gray-500 font-mono">
                      LinkedIn ID: {experience.linkedin_id}
                    </p>
                  )}
                  {experience.is_client && (
                    <p className="text-xs text-blue-700 font-medium">
                      💼 Cette personne a travaillé dans une de vos entreprises clientes !
                    </p>
                  )}
                </div>
                {experience.is_current && (
                  <Badge variant="secondary" className="text-xs">
                    Actuel
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(experience.start_date)} - {formatDate(experience.end_date)}
                </div>
                {experience.duration_months && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(experience.duration_months)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Analyse détaillée de l'historique client */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse Client/HR Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientHistoryAnalyzer lead={lead} />
        </CardContent>
      </Card>
    </div>
  );
}
