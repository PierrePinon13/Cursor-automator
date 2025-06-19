
import React, { useState, useEffect } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, MapPin, Globe, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyInfo {
  id: string;
  name: string | null;
  description: string | null;
  linkedin_id: string;
  website: string | null;
  headquarters: string | null;
  company_size: string | null;
  industry: string | null;
  follower_count: number | null;
  logo: string | null;
  categorie: string | null;
  activities: string | null;
  employee_count: string | null;
  last_enriched_at: string | null;
  enrichment_status: string | null;
  created_at: string;
}

interface CompanyHoverCardProps {
  children: React.ReactNode;
  companyId?: string | null;
  companyLinkedInId?: string | null;
  companyName: string;
  showLogo?: boolean;
}

const CompanyHoverCard = ({ 
  children, 
  companyId, 
  companyLinkedInId, 
  companyName,
  showLogo = false 
}: CompanyHoverCardProps) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!companyId && !companyLinkedInId) return;
      
      setLoading(true);
      try {
        let query = supabase.from('companies').select('*');
        
        if (companyId) {
          query = query.eq('id', companyId);
        } else if (companyLinkedInId) {
          query = query.eq('linkedin_id', companyLinkedInId);
        }
        
        const { data, error } = await query.maybeSingle();
        
        if (error) {
          console.error('Error fetching company info:', error);
          return;
        }
        
        setCompanyInfo(data);
      } catch (error) {
        console.error('Error in fetchCompanyInfo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyInfo();
  }, [companyId, companyLinkedInId]);

  const renderCompanyContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      );
    }

    if (!companyInfo) {
      return (
        <div className="text-center py-4 text-gray-500">
          <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Informations non disponibles</p>
          <p className="text-xs text-gray-400 mt-1">{companyName}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Header with logo and name */}
        <div className="flex items-start gap-3">
          {companyInfo.logo && (
            <img 
              src={companyInfo.logo} 
              alt={companyInfo.name || companyName}
              className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight">
              {companyInfo.name || companyName}
            </h3>
            {companyInfo.industry && (
              <p className="text-xs text-gray-600 mt-1">{companyInfo.industry}</p>
            )}
            {companyInfo.categorie && (
              <Badge variant="outline" className="text-xs mt-1">
                {companyInfo.categorie}
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {companyInfo.description && (
          <p className="text-xs text-gray-700 line-clamp-3">
            {companyInfo.description}
          </p>
        )}

        {/* Company details */}
        <div className="space-y-2">
          {companyInfo.employee_count && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Users className="h-3 w-3" />
              <span>{companyInfo.employee_count} employés</span>
            </div>
          )}
          
          {companyInfo.headquarters && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="h-3 w-3" />
              <span>{companyInfo.headquarters}</span>
            </div>
          )}
          
          {companyInfo.website && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Globe className="h-3 w-3" />
              <a 
                href={companyInfo.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline truncate"
              >
                {companyInfo.website}
              </a>
            </div>
          )}
        </div>

        {/* Activities */}
        {companyInfo.activities && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-700 mb-1">Activités</p>
            <p className="text-xs text-gray-600 line-clamp-2">{companyInfo.activities}</p>
          </div>
        )}

        {/* Enrichment status */}
        {companyInfo.last_enriched_at && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>
                Enrichi le {new Date(companyInfo.last_enriched_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // If showLogo is true and we have company info with logo, show it inline
  if (showLogo && companyInfo?.logo) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1">
            <img 
              src={companyInfo.logo} 
              alt={companyInfo.name || companyName}
              className="h-5 w-5 rounded object-cover flex-shrink-0"
            />
            {children}
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 p-4">
          {renderCompanyContent()}
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="cursor-pointer hover:bg-gray-50 rounded p-1 -m-1">
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        {renderCompanyContent()}
      </HoverCardContent>
    </HoverCard>
  );
};

export default CompanyHoverCard;
