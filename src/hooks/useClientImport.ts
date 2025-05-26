
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
    console.log('🔄 Starting file upload process...');
    console.log('📁 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.error('❌ Invalid file type:', file.type);
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier CSV.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ File validation passed, starting CSV parsing...');
    setLoading(true);

    try {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          console.log('📊 PapaParse completed successfully');
          console.log('📈 Raw results:', {
            dataLength: results.data?.length || 0,
            errorsCount: results.errors?.length || 0,
            meta: results.meta
          });
          
          if (results.errors && results.errors.length > 0) {
            console.error('⚠️ CSV parsing errors:', results.errors);
            toast({
              title: "Erreurs de parsing",
              description: results.errors[0].message,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          const data = results.data as string[][];
          console.log('🔍 Processed data:', {
            totalRows: data.length,
            firstRow: data[0],
            sampleRows: data.slice(0, 3)
          });

          if (!data || data.length === 0) {
            console.error('❌ No data found in CSV');
            toast({
              title: "Erreur",
              description: "Le fichier CSV semble être vide.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          if (data.length < 2) {
            console.error('❌ CSV must have at least headers and one data row');
            toast({
              title: "Erreur",
              description: "Le fichier CSV doit contenir au moins une ligne d'en-têtes et une ligne de données.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Première ligne = headers
          const headers = data[0].filter(header => header && header.trim());
          // Reste des lignes = data
          const rows = data.slice(1).filter(row => row.some(cell => cell && cell.trim()));

          console.log('📋 Extracted headers:', headers);
          console.log('📊 Data rows count:', rows.length);
          console.log('📄 Sample data rows:', rows.slice(0, 2));

          if (headers.length === 0) {
            console.error('❌ No valid headers found');
            toast({
              title: "Erreur",
              description: "Aucun en-tête valide trouvé dans le fichier CSV.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          const csvResult: CSVData = {
            headers,
            rows
          };

          console.log('🎯 Final CSV data structure:', csvResult);

          // Auto-mapping avec logs détaillés
          console.log('🔍 Starting auto-mapping process...');
          const mapping: Partial<ColumnMapping> = {};
          
          headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();
            console.log(`🔍 Analyzing header ${index}: "${header}" (lowercase: "${lowerHeader}")`);
            
            if ((lowerHeader.includes('name') || lowerHeader.includes('nom') || 
                 lowerHeader.includes('entreprise') || lowerHeader.includes('company')) &&
                !mapping.company_name) {
              mapping.company_name = header;
              console.log(`✅ Mapped company_name to: "${header}"`);
            } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('url') &&
                      !mapping.company_linkedin_url) {
              mapping.company_linkedin_url = header;
              console.log(`✅ Mapped company_linkedin_url to: "${header}"`);
            } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('id') &&
                      !mapping.company_linkedin_id) {
              mapping.company_linkedin_id = header;
              console.log(`✅ Mapped company_linkedin_id to: "${header}"`);
            }
          });
          
          console.log('🎯 Final auto-mapping result:', mapping);
          
          try {
            setCsvData(csvResult);
            setColumnMapping(prev => ({ ...prev, ...mapping }));
            console.log('✅ State updated successfully');
            setLoading(false);
            
            toast({
              title: "Succès",
              description: `Fichier CSV chargé avec succès : ${rows.length} ligne(s) de données trouvée(s).`,
            });
          } catch (stateError) {
            console.error('❌ Error updating state:', stateError);
            toast({
              title: "Erreur",
              description: "Erreur lors de la mise à jour de l'état de l'application.",
              variant: "destructive",
            });
            setLoading(false);
          }
        },
        error: (error) => {
          console.error('❌ PapaParse error:', error);
          toast({
            title: "Erreur",
            description: "Erreur lors de la lecture du fichier CSV.",
            variant: "destructive",
          });
          setLoading(false);
        }
      });
    } catch (parseError) {
      console.error('❌ Unexpected error during file parsing:', parseError);
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors du traitement du fichier.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleImport = async () => {
    console.log('🚀 Starting import process...');
    console.log('📊 Current state:', {
      csvData: csvData ? { headers: csvData.headers, rowsCount: csvData.rows.length } : null,
      columnMapping,
      loading
    });

    if (!csvData || !columnMapping.company_name) {
      console.error('❌ Missing required data for import');
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

      console.log('📍 Column indices:', { nameIndex, urlIndex, idIndex });

      const clientsData = csvData.rows
        .filter(row => row[nameIndex] && row[nameIndex].trim())
        .map(row => ({
          company_name: row[nameIndex].trim(),
          company_linkedin_url: urlIndex >= 0 && row[urlIndex] ? row[urlIndex].trim() : null,
          company_linkedin_id: idIndex >= 0 && row[idIndex] ? row[idIndex].trim() : null,
        }));

      console.log('📋 Processed clients data:', {
        count: clientsData.length,
        sample: clientsData.slice(0, 2)
      });

      if (clientsData.length === 0) {
        throw new Error('Aucun client valide trouvé dans le fichier CSV');
      }

      console.log('💾 Calling importClients...');
      await importClients(clientsData);
      console.log('✅ Import completed successfully');
      
      // Reset state after successful import
      reset();
      
    } catch (error) {
      console.error('❌ Import error:', error);
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
    console.log('🔄 Resetting import state...');
    setCsvData(null);
    setColumnMapping({
      company_name: '',
      company_linkedin_url: '',
      company_linkedin_id: '',
    });
    setLoading(false);
    console.log('✅ Reset completed');
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
