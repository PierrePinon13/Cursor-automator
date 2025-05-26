
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CSVData {
  headers: string[];
  rows: string[][];
}

export function ImportClientsDialog({ open, onOpenChange }: ImportClientsDialogProps) {
  const { importClients } = useClients();
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [columnMapping, setColumnMapping] = useState({
    company_name: '',
    company_linkedin_url: '',
    company_linkedin_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (csvText: string): CSVData => {
    console.log('Parsing CSV text:', csvText.substring(0, 200) + '...');
    
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log('Found lines:', lines.length);
    
    if (lines.length < 2) {
      throw new Error('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données.');
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    console.log('Headers found:', headers);

    // Parse rows
    const rows = lines.slice(1).map((line, index) => {
      try {
        const cells = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        console.log(`Row ${index + 1}:`, cells);
        return cells;
      } catch (err) {
        console.error(`Error parsing row ${index + 1}:`, err);
        throw new Error(`Erreur lors du parsing de la ligne ${index + 1}`);
      }
    });

    return { headers, rows };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload triggered');
    const file = event.target.files?.[0];
    
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', { name: file.name, size: file.size, type: file.type });

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Veuillez sélectionner un fichier CSV.');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('FileReader onload triggered');
        const csv = e.target?.result as string;
        
        if (!csv) {
          throw new Error('Le fichier semble être vide ou illisible.');
        }

        console.log('CSV content length:', csv.length);
        
        const parsedData = parseCSV(csv);
        setCsvData(parsedData);
        setError(null);

        // Auto-mapping simple
        const mapping: any = {};
        parsedData.headers.forEach((header) => {
          const lowerHeader = header.toLowerCase();
          console.log('Checking header for auto-mapping:', lowerHeader);
          
          if (lowerHeader.includes('name') || lowerHeader.includes('nom') || lowerHeader.includes('entreprise') || lowerHeader.includes('company')) {
            mapping.company_name = header;
            console.log('Auto-mapped company_name to:', header);
          } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('url')) {
            mapping.company_linkedin_url = header;
            console.log('Auto-mapped company_linkedin_url to:', header);
          } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('id')) {
            mapping.company_linkedin_id = header;
            console.log('Auto-mapped company_linkedin_id to:', header);
          }
        });
        
        console.log('Final mapping:', mapping);
        setColumnMapping(mapping);
        
      } catch (err) {
        console.error('Error in handleFileUpload:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier CSV. Vérifiez le format.');
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      setError('Erreur lors de la lecture du fichier.');
    };

    console.log('Starting to read file as text');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    console.log('Starting import process');
    console.log('CSV data:', csvData);
    console.log('Column mapping:', columnMapping);

    if (!csvData || !columnMapping.company_name) {
      const errorMsg = 'Veuillez mapper au moins la colonne "Nom de l\'entreprise".';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nameIndex = csvData.headers.indexOf(columnMapping.company_name);
      const urlIndex = columnMapping.company_linkedin_url ? csvData.headers.indexOf(columnMapping.company_linkedin_url) : -1;
      const idIndex = columnMapping.company_linkedin_id ? csvData.headers.indexOf(columnMapping.company_linkedin_id) : -1;

      console.log('Column indices:', { nameIndex, urlIndex, idIndex });

      if (nameIndex === -1) {
        throw new Error('Colonne nom de l\'entreprise non trouvée');
      }

      const clientsData = csvData.rows
        .filter((row, index) => {
          const hasName = row[nameIndex] && row[nameIndex].trim();
          console.log(`Row ${index + 1} has name:`, hasName, 'Value:', row[nameIndex]);
          return hasName;
        })
        .map((row, index) => {
          const clientData = {
            company_name: row[nameIndex].trim(),
            company_linkedin_url: urlIndex >= 0 && row[urlIndex] ? row[urlIndex].trim() : null,
            company_linkedin_id: idIndex >= 0 && row[idIndex] ? row[idIndex].trim() : null,
          };
          console.log(`Prepared client data ${index + 1}:`, clientData);
          return clientData;
        });

      console.log('Final clients data for import:', clientsData);
      console.log('Number of clients to import:', clientsData.length);

      if (clientsData.length === 0) {
        throw new Error('Aucun client valide trouvé dans le fichier CSV');
      }

      await importClients(clientsData);
      
      console.log('Import completed successfully');
      onOpenChange(false);
      setCsvData(null);
      setColumnMapping({ company_name: '', company_linkedin_url: '', company_linkedin_id: '' });
      
    } catch (err) {
      console.error('Error during import:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import. Vérifiez vos données.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    console.log('Resetting form');
    setCsvData(null);
    setColumnMapping({ company_name: '', company_linkedin_url: '', company_linkedin_id: '' });
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      console.log('Dialog open change:', open);
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importer des clients depuis un CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!csvData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvFile">Fichier CSV</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Format attendu :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Fichier CSV avec virgules comme séparateurs</li>
                  <li>Première ligne : en-têtes des colonnes</li>
                  <li>Colonnes recommandées : Nom entreprise, URL LinkedIn, ID LinkedIn</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <FileText className="h-4 w-4" />
                <span>Fichier chargé : {csvData.rows.length} ligne(s) détectée(s)</span>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Mapping des colonnes</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom de l'entreprise *</Label>
                    <Select
                      value={columnMapping.company_name}
                      onValueChange={(value) => {
                        console.log('Company name mapping changed to:', value);
                        setColumnMapping(prev => ({ ...prev, company_name: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une colonne" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>URL LinkedIn</Label>
                    <Select
                      value={columnMapping.company_linkedin_url}
                      onValueChange={(value) => {
                        console.log('LinkedIn URL mapping changed to:', value);
                        setColumnMapping(prev => ({ ...prev, company_linkedin_url: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optionnel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucune</SelectItem>
                        {csvData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>ID LinkedIn</Label>
                    <Select
                      value={columnMapping.company_linkedin_id}
                      onValueChange={(value) => {
                        console.log('LinkedIn ID mapping changed to:', value);
                        setColumnMapping(prev => ({ ...prev, company_linkedin_id: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optionnel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucune</SelectItem>
                        {csvData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {csvData.rows.slice(0, 3).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Aperçu des données</h4>
                  <div className="border rounded-md p-3 bg-gray-50 text-sm">
                    {csvData.rows.slice(0, 3).map((row, index) => (
                      <div key={index} className="mb-2">
                        <strong>Ligne {index + 1}:</strong> {row.join(' | ')}
                      </div>
                    ))}
                    {csvData.rows.length > 3 && (
                      <div className="text-gray-500">... et {csvData.rows.length - 3} ligne(s) de plus</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            {csvData && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Nouveau fichier
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading || !columnMapping.company_name}
                >
                  {loading ? 'Import en cours...' : 'Importer'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
