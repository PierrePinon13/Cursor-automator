
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { useCompanyEnrichment } from '@/hooks/useCompanyEnrichment';

interface EnrichButtonProps {
  companyLinkedInId: string | null;
  companyName: string;
}

const EnrichButton = ({ companyLinkedInId, companyName }: EnrichButtonProps) => {
  const { enrichCompany, getEnrichmentData, loading } = useCompanyEnrichment();
  const [enrichmentData, setEnrichmentData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Check if company is already enriched on mount
  useEffect(() => {
    if (companyLinkedInId) {
      checkEnrichmentStatus();
    }
  }, [companyLinkedInId]);

  const checkEnrichmentStatus = async () => {
    if (!companyLinkedInId) return;
    
    setLoadingData(true);
    try {
      const data = await getEnrichmentData(companyLinkedInId);
      setEnrichmentData(data);
    } catch (error) {
      console.error('Error checking enrichment status:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleEnrich = async () => {
    if (!companyLinkedInId) {
      return;
    }

    const result = await enrichCompany(companyLinkedInId);
    if (result) {
      setEnrichmentData(result);
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

  if (enrichmentData) {
    const enrichedDate = new Date(enrichmentData.enriched_at).toLocaleDateString('fr-FR');
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Enrichi le {enrichedDate}
        </Badge>
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
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnrich}
      disabled={loading}
      className="h-7 px-3 text-xs"
    >
      {loading ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Enrichissement...
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3 mr-1" />
          Enrichir
        </>
      )}
    </Button>
  );
};

export default EnrichButton;
