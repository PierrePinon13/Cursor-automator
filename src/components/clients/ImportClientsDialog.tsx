
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setError('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => 
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        );

        setCsvData({ headers, rows });
        setError(null);

        // Auto-mapping simple
        const mapping: any = {};
        headers.forEach((header, index) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('name') || lowerHeader.includes('nom') || lowerHeader.includes('entreprise')) {
            mapping.company_name = header;
          } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('url')) {
            mapping.company_linkedin_url = header;
          } else if (lowerHeader.includes('linkedin') && lowerHeader.includes('id')) {
            mapping.company_linkedin_id = header;
          }
        });
        setColumnMapping(mapping);
      } catch (err) {
        setError('Erreur lors de la lecture du fichier CSV. Vérifiez le format.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData || !columnMapping.company_name) {
      setError('Veuillez mapper au moins la colonne "Nom de l\'entreprise".');
      return;
    }

    setLoading(true);
    try {
      const nameIndex = csvData.headers.indexOf(columnMapping.company_name);
      const urlIndex = columnMapping.company_linkedin_url ? csvData.headers.indexOf(columnMapping.company_linkedin_url) : -1;
      const idIndex = columnMapping.company_linkedin_id ? csvData.headers.indexOf(columnMapping.company_linkedin_id) : -1;

      const clientsData = csvData.rows
        .filter(row => row[nameIndex] && row[nameIndex].trim()) // Filtrer les lignes vides
        .map(row => ({
          company_name: row[nameIndex].trim(),
          company_linkedin_url: urlIndex >= 0 && row[urlIndex] ? row[urlIndex].trim() : null,
          company_linkedin_id: idIndex >= 0 && row[idIndex] ? row[idIndex].trim() : null,
        }));

      await importClients(clientsData);
      onOpenChange(false);
      setCsvData(null);
      setColumnMapping({ company_name: '', company_linkedin_url: '', company_linkedin_id: '' });
    } catch (err) {
      setError('Erreur lors de l\'import. Vérifiez vos données.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCsvData(null);
    setColumnMapping({ company_name: '', company_linkedin_url: '', company_linkedin_id: '' });
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
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
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, company_name: value }))}
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
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, company_linkedin_url: value }))}
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
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, company_linkedin_id: value }))}
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
