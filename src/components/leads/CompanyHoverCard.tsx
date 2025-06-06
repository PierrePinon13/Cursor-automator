
import React from 'react';
import { Building, Users, MapPin, Globe, ExternalLink } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CompanyHoverCardProps {
  companyId?: string;
  companyLinkedInId?: string;
  companyName: string;
  children: React.ReactNode;
}

const CompanyHoverCard = ({ companyId, companyLinkedInId, companyName, children }: CompanyHoverCardProps) => {
  console.log('🏢 CompanyHoverCard props:', { companyId, companyLinkedInId, companyName });

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', companyId, companyLinkedInId, companyName],
    queryFn: async () => {
      console.log('🔍 Fetching company data for:', { companyId, companyLinkedInId, companyName });
      
      // Priorité 1: Si on a un company_id
      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        console.log('🎯 Searching by company_id:', companyId);
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .maybeSingle();
        
        if (!error && data) {
          console.log('✅ Company data found by ID:', data);
          return data;
        }
        console.log('⚠️ No company found by ID:', error);
      }
      
      // Priorité 2: Si on a un linkedin_id valide
      if (companyLinkedInId && 
          companyLinkedInId !== 'null' && 
          companyLinkedInId !== 'undefined' && 
          companyLinkedInId.trim() !== '') {
        console.log('🎯 Searching by LinkedIn ID:', companyLinkedInId);
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('linkedin_id', companyLinkedInId)
          .maybeSingle();
        
        if (!error && data) {
          console.log('✅ Company data found by LinkedIn ID:', data);
          return data;
        }
        console.log('⚠️ No company found by LinkedIn ID:', error);
      }
      
      // Priorité 3: Recherche par nom (approximatif)
      if (companyName && 
          companyName !== 'Entreprise inconnue' && 
          companyName.trim() !== '') {
        console.log('🎯 Searching by name:', companyName);
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .ilike('name', `%${companyName.trim()}%`)
          .limit(1)
          .maybeSingle();
        
        if (!error && data) {
          console.log('✅ Company data found by name:', data);
          return data;
        }
        console.log('⚠️ No company found by name:', error);
      }
      
      console.log('❌ No company data found anywhere');
      return null;
    },
    enabled: !!(companyId || companyLinkedInId || (companyName && companyName !== 'Entreprise inconnue')),
    retry: false
  });

  const handleCompanyClick = () => {
    if (company?.linkedin_id) {
      const linkedinUrl = `https://www.linkedin.com/company/${company.linkedin_id}`;
      window.open(linkedinUrl, '_blank');
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div 
          onClick={handleCompanyClick} 
          className={`cursor-pointer underline decoration-dotted ${
            company?.linkedin_id ? 'hover:text-blue-600' : 'hover:text-gray-600'
          }`}
        >
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
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                {company.description}
              </p>
            )}
            
            <div className="grid grid-cols-1 gap-2 text-xs">
              {company.industry && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {company.industry}
                  </Badge>
                </div>
              )}
              
              {company.company_size && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-3 w-3" />
                  <span>{company.company_size} employés</span>
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
              
              {company.follower_count && company.follower_count > 0 && (
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
            <p className="text-xs text-gray-500 mb-2">Informations détaillées non disponibles</p>
            
            {/* Essayer d'enrichir l'entreprise si on a un LinkedIn ID */}
            {companyLinkedInId && companyLinkedInId !== 'null' && companyLinkedInId !== 'undefined' && (
              <button
                onClick={async () => {
                  console.log('🔄 Tentative d\'enrichissement pour:', companyLinkedInId);
                  try {
                    const { data, error } = await supabase.functions.invoke('fetch-company-info', {
                      body: { companyLinkedInId }
                    });
                    if (data?.success) {
                      window.location.reload(); // Recharger pour voir les nouvelles données
                    }
                  } catch (error) {
                    console.error('Erreur enrichissement:', error);
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Essayer de récupérer les informations
              </button>
            )}
            
            <div className="text-xs text-gray-300 mt-2">
              ID: {companyId || 'Non défini'}<br/>
              LinkedIn: {companyLinkedInId || 'Non défini'}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

export default CompanyHoverCard;
