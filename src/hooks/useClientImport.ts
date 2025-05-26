
import { useState } from 'react';
import { useClients } from './useClients';
import { parseCSVText, CSVParseResult } from '@/utils/csvParser';
import { useToast } from './use-toast';

interface ColumnMapping {
  company_name: string;
  company_linkedin_url: string;
  company_linkedin_id: string;
}

export function useClientImport() {
  const { importClients } = useClients();
  const { toast } = useToast();
  const [csvData, setCsvData] = useState<CSVParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    company_name: '',
    company_linkedin_url: '',
    company_linkedin_id: '',
  });
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (file: File) => {
    console.log('Processing file:', file.name);
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier CSV.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        if (!csvText) {
          throw new Error('Le fichier semble être vide');
        }

        console.log('Parsing CSV with length:', csvText.length);
        const result = parseCSVText(csvText);
        
        if (result.errors.length > 0) {
          console.error('CSV parsing errors:', result.errors);
          toast({
            title: "Erreurs de parsing",
            description: result.errors[0],
            variant: "destructive",
          });
          return;
        }

        console.log('CSV parsed successfully:', result);
        setCsvData(result);
        
        // Auto-mapping
        const mapping: Partial<ColumnMapping> = {};
        result.headers.forEach((header) => {
          const lowerHeader = header.toLowerCase();
          
          if ((lowerHeader.includes('name') || lowerHeader.includes('nom') || 
               lowerHeader.includes('entreprise') || lowerHeader.includes('company')) &&
              !mapping.company_name) {
            mapping.company_name = header;
          } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('url') &&
                    !mapping.company_linkedin_url) {
            mapping.company_linkedin_url = header;
          } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('id') &&
                    !mapping.company_linkedin_id) {
            mapping.company_linkedin_id = header;
          }
        });
        
        setColumnMapping(prev => ({ ...prev, ...mapping }));
        
      } catch (error) {
        console.error('File processing error:', error);
        toast({
          title: "Erreur",
          description: error instanceof Error ? error.message : 'Erreur lors de la lecture du fichier',
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la lecture du fichier.",
        variant: "destructive",
      });
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData || !columnMapping.company_name) {
      toast({
        title: "Erreur",
        description: 'Veuillez mapper au moins la colonne "Nom de l\'entreprise".',
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const nameIndex = csvData.headers.indexOf(columnMapping.company_name);
      const urlIndex = columnMapping.company_linkedin_url ? 
        csvData.headers.indexOf(columnMapping.company_linkedin_url) : -1;
      const idIndex = columnMapping.company_linkedin_id ? 
        csvData.headers.indexOf(columnMapping.company_linkedin_id) : -1;

      const clientsData = csvData.rows
        .filter(row => row[nameIndex] && row[nameIndex].trim())
        .map(row => ({
          company_name: row[nameIndex].trim(),
          company_linkedin_url: urlIndex >= 0 && row[urlIndex] ? row[urlIndex].trim() : null,
          company_linkedin_id: idIndex >= 0 && row[idIndex] ? row[idIndex].trim() : null,
        }));

      if (clientsData.length === 0) {
        throw new Error('Aucun client valide trouvé dans le fichier CSV');
      }

      await importClients(clientsData);
      
      // Reset state after successful import
      reset();
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : 'Erreur lors de l\'import',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCsvData(null);
    setColumnMapping({
      company_name: '',
      company_linkedin_url: '',
      company_linkedin_id: '',
    });
  };

  return {
    csvData,
    columnMapping,
    setColumnMapping,
    loading,
    handleFileUpload,
    handleImport,
    reset,
  };
}
