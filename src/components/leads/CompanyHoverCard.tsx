
import React from 'react';
import { Building, Users, MapPin, Globe, Calendar } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CompanyHoverCardProps {
  companyId?: string;
  companyName: string;
  children: React.ReactNode;
}

const CompanyHoverCard = ({ companyId, companyName, children }: CompanyHoverCardProps) => {
  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (error) {
        console.error('Error fetching company:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!companyId
  });

  // Si pas de companyId, afficher juste le nom sans hover
  if (!companyId) {
    return <>{children}</>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        ) : company ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-sm">{company.name || companyName}</h4>
            </div>
            
            {company.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
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
                <div className="flex items-center gap-2 text-gray-500">
                  <Users className="h-3 w-3" />
                  <span>{company.company_size}</span>
                </div>
              )}
              
              {company.headquarters && (
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span>{company.headquarters}</span>
                </div>
              )}
              
              {company.website && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Globe className="h-3 w-3" />
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              
              {company.follower_count && (
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="text-blue-600">👥</span>
                  <span>{company.follower_count.toLocaleString()} abonnés LinkedIn</span>
                </div>
              )}
            </div>
            
            {company.last_updated_at && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>Mis à jour le {new Date(company.last_updated_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Informations sur l'entreprise non disponibles</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

export default CompanyHoverCard;
