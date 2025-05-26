
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { useHrProviders } from '@/hooks/useHrProviders';
import { useToast } from '@/hooks/use-toast';
import { parseCSVText, CSVParseResult } from '@/utils/csvParser';

interface ImportHrProvidersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HrProviderImportData {
  company_name: string;
  company_linkedin_url: string;
  company_linkedin_id: string;
}

export function ImportHrProvidersDialog({ open, onOpenChange }: ImportHrProvidersDialogProps) {
  const { createHrProvider } = useHrProviders();
  const { toast } = useToast();
  const [csvData, setCsvData] = useState<CSVParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSVText(text);
      setCsvData(parsed);
      setImportResults(null);
      
      // Auto-map columns
      const mapping: Record<string, string> = {};
      parsed.headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('nom') || lowerHeader.includes('name') || lowerHeader.includes('company')) {
          mapping['company_name'] = header;
        } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('url')) {
          mapping['company_linkedin_url'] = header;
        } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('id')) {
          mapping['company_linkedin_id'] = header;
        }
      });
      setColumnMapping(mapping);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData) return;

    setImporting(true);
    const results = { success: 0, errors: [] as string[] };

    try {
      for (let i = 0; i < csvData.rows.length; i++) {
        const row = csvData.rows[i];
        const rowData: Partial<HrProviderImportData> = {};

        // Map data according to column mapping
        Object.entries(columnMapping).forEach(([field, header]) => {
          const columnIndex = csvData.headers.indexOf(header);
          if (columnIndex !== -1) {
            const value = row[columnIndex]?.trim();
            if (value) {
              (rowData as any)[field] = value;
            }
          }
        });

        // Validate required fields
        if (!rowData.company_name) {
          results.errors.push(`Ligne ${i + 2}: Nom d'entreprise manquant`);
          continue;
        }

        try {
          await createHrProvider({
            company_name: rowData.company_name,
            company_linkedin_url: rowData.company_linkedin_url || null,
            company_linkedin_id: rowData.company_linkedin_id || null
          });
          results.success++;
        } catch (error) {
          results.errors.push(`Ligne ${i + 2}: Erreur lors de la création - ${error}`);
        }
      }

      setImportResults(results);
      
      if (results.success > 0) {
        toast({
          title: "Import terminé",
          description: `${results.success} prestataire(s) RH importé(s) avec succès.`,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: "Une erreur est survenue lors de l'import.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setCsvData(null);
    setColumnMapping({});
    setImportResults(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des prestataires RH depuis un CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!csvData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Fichier CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Le fichier CSV doit contenir au minimum une colonne pour le nom de l'entreprise. 
                  Les colonnes pour l'URL LinkedIn et l'ID LinkedIn sont optionnelles.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              {csvData.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div>Erreurs détectées dans le fichier CSV :</div>
                    <ul className="list-disc list-inside mt-2">
                      {csvData.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuration des colonnes</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nom de l'entreprise *</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={columnMapping['company_name'] || ''}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, company_name: e.target.value }))}
                    >
                      <option value="">Sélectionner une colonne</option>
                      {csvData.headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>URL LinkedIn</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={columnMapping['company_linkedin_url'] || ''}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, company_linkedin_url: e.target.value }))}
                    >
                      <option value="">Sélectionner une colonne</option>
                      {csvData.headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>ID LinkedIn</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={columnMapping['company_linkedin_id'] || ''}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, company_linkedin_id: e.target.value }))}
                    >
                      <option value="">Sélectionner une colonne</option>
                      {csvData.headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Aperçu des données</h3>
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvData.headers.map(header => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.rows.slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {csvData.rows.length > 5 && (
                  <p className="text-sm text-gray-500">
                    ... et {csvData.rows.length - 5} ligne(s) de plus
                  </p>
                )}
              </div>

              {importResults && (
                <Alert variant={importResults.errors.length > 0 ? "destructive" : "default"}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div>Import terminé :</div>
                    <ul className="list-disc list-inside mt-2">
                      <li>{importResults.success} prestataire(s) RH importé(s) avec succès</li>
                      {importResults.errors.length > 0 && (
                        <li>{importResults.errors.length} erreur(s)</li>
                      )}
                    </ul>
                    {importResults.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">Voir les erreurs</summary>
                        <ul className="list-disc list-inside mt-1">
                          {importResults.errors.map((error, index) => (
                            <li key={index} className="text-sm">{error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetDialog}>
                  Recommencer
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!columnMapping['company_name'] || importing || csvData.rows.length === 0}
                >
                  {importing ? 'Import en cours...' : `Importer ${csvData.rows.length} prestataire(s) RH`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
