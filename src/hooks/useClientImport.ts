
import { useState } from 'react';
import { useClients } from './useClients';
import { useToast } from './use-toast';
import Papa from 'papaparse';

interface ColumnMapping {
  company_name: string;
  company_linkedin_url: string;
  company_linkedin_id: string;
}

interface CSVData {
  headers: string[];
  rows: string[][];
}

export function useClientImport() {
  const { importClients } = useClients();
  const { toast } = useToast();
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    company_name: '',
    company_linkedin_url: '',
    company_linkedin_id: '',
  });
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (file: File) => {
    console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier CSV.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting CSV parsing with PapaParse...');

    Papa.parse(file, {
      header: false, // On va parser manuellement pour avoir plus de contrôle
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        console.log('PapaParse results:', results);
        
        if (results.errors && results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          toast({
            title: "Erreurs de parsing",
            description: results.errors[0].message,
            variant: "destructive",
          });
          return;
        }

        const data = results.data as string[][];
        console.log('Parsed data:', data);

        if (!data || data.length === 0) {
          toast({
            title: "Erreur",
            description: "Le fichier CSV semble être vide.",
            variant: "destructive",
          });
          return;
        }

        // Première ligne = headers
        const headers = data[0];
        // Reste des lignes = data
        const rows = data.slice(1).filter(row => row.some(cell => cell && cell.trim()));

        console.log('Headers:', headers);
        console.log('Rows count:', rows.length);
        console.log('First few rows:', rows.slice(0, 3));

        const csvResult: CSVData = {
          headers,
          rows
        };

        setCsvData(csvResult);
        
        // Auto-mapping
        const mapping: Partial<ColumnMapping> = {};
        headers.forEach((header) => {
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
        
        console.log('Auto-mapping result:', mapping);
        setColumnMapping(prev => ({ ...prev, ...mapping }));
      },
      error: (error) => {
        console.error('PapaParse error:', error);
        toast({
          title: "Erreur",
          description: "Erreur lors de la lecture du fichier CSV.",
          variant: "destructive",
        });
      }
    });
  };

  const handleImport = async () => {
    console.log('Starting import process...');
    console.log('CSV data:', csvData);
    console.log('Column mapping:', columnMapping);

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

      console.log('Column indices:', { nameIndex, urlIndex, idIndex });

      const clientsData = csvData.rows
        .filter(row => row[nameIndex] && row[nameIndex].trim())
        .map(row => ({
          company_name: row[nameIndex].trim(),
          company_linkedin_url: urlIndex >= 0 && row[urlIndex] ? row[urlIndex].trim() : null,
          company_linkedin_id: idIndex >= 0 && row[idIndex] ? row[idIndex].trim() : null,
        }));

      console.log('Processed clients data:', clientsData);

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
    console.log('Resetting import state...');
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
