
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useCompanyEnrichment } from '@/hooks/useCompanyEnrichment';

interface EnrichButtonProps {
  companyLinkedInId: string | null;
  companyName: string;
}

const EnrichButton = ({ companyLinkedInId, companyName }: EnrichButtonProps) => {
  const { enrichCompany, getCompanyData, loading } = useCompanyEnrichment();
  const [companyData, setCompanyData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Check company data on mount
  useEffect(() => {
    if (companyLinkedInId) {
      checkCompanyData();
    }
  }, [companyLinkedInId]);

  const checkCompanyData = async () => {
    if (!companyLinkedInId) return;
    
    setLoadingData(true);
    try {
      const data = await getCompanyData(companyLinkedInId);
      setCompanyData(data);
    } catch (error) {
      console.error('Error checking company data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleEnrich = async () => {
    if (!companyLinkedInId) {
      return;
    }

    const result = await enrichCompany(companyLinkedInId, 'manual');
    if (result) {
      // Refresh company data after enrichment
      setTimeout(() => {
        checkCompanyData();
      }, 1000);
    }
  };

  if (!companyLinkedInId) {
    return (
      <Badge variant="secondary" className="text-xs">
        LinkedIn ID manquant
      </Badge>
    );
  }

  if (loadingData) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Vérification...
      </Badge>
    );
  }

  const getStatusDisplay = () => {
    if (!companyData) {
      return {
        badge: <Badge variant="secondary" className="text-xs">Non trouvé</Badge>,
        showButton: true
      };
    }

    const status = companyData.enrichment_status;
    const lastEnriched = companyData.last_enriched_at;

    switch (status) {
      case 'enriched':
        const enrichedDate = new Date(lastEnriched).toLocaleDateString('fr-FR');
        return {
          badge: (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Enrichi le {enrichedDate}
            </Badge>
          ),
          showButton: true
        };
      
      case 'processing':
        return {
          badge: (
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              En cours...
            </Badge>
          ),
          showButton: false
        };
      
      case 'error':
        return {
          badge: (
            <Badge variant="outline" className="text-xs text-red-600 border-red-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Erreur
            </Badge>
          ),
          showButton: true
        };
      
      default:
        return {
          badge: (
            <Badge variant="secondary" className="text-xs">
              En attente
            </Badge>
          ),
          showButton: true
        };
    }
  };

  const { badge, showButton } = getStatusDisplay();

  return (
    <div className="flex items-center gap-2">
      {badge}
      {showButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEnrich}
          disabled={loading}
          className="h-6 px-2 text-xs"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
};

export default EnrichButton;
