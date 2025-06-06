
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
  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', companyId, companyLinkedInId],
    queryFn: async () => {
      console.log('🔍 Fetching company data for:', { companyId, companyLinkedInId, companyName });
      
      // Si on a un company_id, l'utiliser en priorité
      if (companyId) {
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
      
      // Sinon essayer avec linkedin_id
      if (companyLinkedInId) {
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
      
      // Fallback : essayer par nom (approximatif)
      if (companyName && companyName !== 'Entreprise inconnue') {
        console.log('🎯 Searching by name:', companyName);
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .ilike('name', `%${companyName}%`)
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
    enabled: !!(companyId || companyLinkedInId || (companyName && companyName !== 'Entreprise inconnue'))
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
        <div onClick={handleCompanyClick} className="cursor-pointer hover:text-blue-600 underline">
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{companyName}</p>
            <p className="text-xs text-red-400">Erreur lors du chargement: {error.message}</p>
          </div>
        ) : company ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-sm">{company.name || companyName}</h4>
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
              
              {company.follower_count && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-3 w-3" />
                  <span>{company.follower_count.toLocaleString()} abonnés</span>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-400 border-t pt-2">
              LinkedIn ID: {company.linkedin_id}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{companyName}</p>
            <p className="text-xs text-gray-400">Informations non disponibles</p>
            <div className="text-xs text-gray-300 mt-2">
              Debug: ID={companyId}, LinkedIn={companyLinkedInId}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

export default CompanyHoverCard;
