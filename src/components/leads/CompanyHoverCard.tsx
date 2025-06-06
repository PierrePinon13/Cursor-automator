
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
      
      // Nettoyer les valeurs null/undefined/empty
      const cleanCompanyId = companyId && companyId !== 'null' && companyId !== 'undefined' && companyId.trim() !== '' ? companyId : null;
      const cleanLinkedInId = companyLinkedInId && companyLinkedInId !== 'null' && companyLinkedInId !== 'undefined' && companyLinkedInId.trim() !== '' && companyLinkedInId !== '0' ? companyLinkedInId : null;
      const cleanCompanyName = companyName && companyName !== 'Entreprise inconnue' && companyName !== 'Unknown' && companyName.trim() !== '' ? companyName.trim() : null;
      
      console.log('🧹 Cleaned values:', { cleanCompanyId, cleanLinkedInId, cleanCompanyName });
      
      // Méthode 1: Recherche par company_id
      if (cleanCompanyId) {
        console.log('🎯 Searching by company_id:', cleanCompanyId);
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', cleanCompanyId)
          .maybeSingle();
        
        if (!error && data) {
          console.log('✅ Company found by ID:', data);
          return data;
        }
        console.log('⚠️ No company found by ID:', error?.message);
      }
      
      // Méthode 2: Recherche par linkedin_id
      if (cleanLinkedInId) {
        console.log('🎯 Searching by LinkedIn ID:', cleanLinkedInId);
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('linkedin_id', cleanLinkedInId)
          .maybeSingle();
        
        if (!error && data) {
          console.log('✅ Company found by LinkedIn ID:', data);
          return data;
        }
        console.log('⚠️ No company found by LinkedIn ID:', error?.message);
      }
      
      // Méthode 3: Recherche par nom
      if (cleanCompanyName) {
        console.log('🎯 Searching by name:', cleanCompanyName);
        
        // Recherche exacte d'abord
        let { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('name', cleanCompanyName)
          .maybeSingle();
        
        if (!error && data) {
          console.log('✅ Company found by exact name:', data);
          return data;
        }
        
        // Recherche approximative
        console.log('🎯 Searching by approximate name:', cleanCompanyName);
        ({ data, error } = await supabase
          .from('companies')
          .select('*')
          .ilike('name', `%${cleanCompanyName}%`)
          .limit(1)
          .maybeSingle());
        
        if (!error && data) {
          console.log('✅ Company found by approximate name:', data);
          return data;
        }
        console.log('⚠️ No company found by name:', error?.message);
      }
      
      console.log('❌ No company data found with any method');
      return null;
    },
    enabled: !!(companyId || companyLinkedInId || (companyName && companyName !== 'Entreprise inconnue')),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const handleCompanyClick = () => {
    if (company?.linkedin_id) {
      const linkedinUrl = `https://www.linkedin.com/company/${company.linkedin_id}`;
      window.open(linkedinUrl, '_blank');
    }
  };

  const handleEnrichCompany = async () => {
    const cleanLinkedInId = companyLinkedInId && companyLinkedInId !== 'null' && companyLinkedInId !== 'undefined' && companyLinkedInId.trim() !== '' && companyLinkedInId !== '0' ? companyLinkedInId : null;
    
    if (!cleanLinkedInId) {
      console.log('❌ Cannot enrich: no valid LinkedIn ID');
      return;
    }
    
    console.log('🔄 Enriching company with LinkedIn ID:', cleanLinkedInId);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-company-info', {
        body: { companyLinkedInId: cleanLinkedInId }
      });
      
      if (data?.success) {
        console.log('✅ Company enriched successfully');
        window.location.reload();
      } else {
        console.error('❌ Enrichment failed:', error || data?.error);
      }
    } catch (error) {
      console.error('❌ Enrichment error:', error);
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
            <p className="text-xs text-gray-500 mb-3">Aucune information détaillée disponible en base</p>
            
            {/* Option d'enrichissement si LinkedIn ID disponible */}
            {companyLinkedInId && 
             companyLinkedInId !== 'null' && 
             companyLinkedInId !== 'undefined' && 
             companyLinkedInId.trim() !== '' && 
             companyLinkedInId !== '0' && (
              <button
                onClick={handleEnrichCompany}
                className="text-xs text-blue-600 hover:text-blue-800 underline bg-blue-50 px-2 py-1 rounded"
              >
                Enrichir les données de l'entreprise
              </button>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

export default CompanyHoverCard;
