
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { useClientImport } from '@/hooks/useClientImport';

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportClientsDialog({ open, onOpenChange }: ImportClientsDialogProps) {
  const {
    csvData,
    columnMapping,
    setColumnMapping,
    loading,
    handleFileUpload,
    handleImport,
    reset,
  } = useClientImport();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Fichier sélectionné :', file);
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDialogClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      reset();
    }
  };

  const handleImportClick = async () => {
    await handleImport();
    // Close dialog only on successful import (handleImport will handle errors)
    if (csvData && columnMapping.company_name) {
      onOpenChange(false);
    }
  };

  console.log('csvData:', csvData);

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
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
                  onChange={handleFileChange}
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
                      onValueChange={(value) => 
                        setColumnMapping(prev => ({ ...prev, company_name: value }))
                      }
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
                      onValueChange={(value) => 
                        setColumnMapping(prev => ({ ...prev, company_linkedin_url: value }))
                      }
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
                      onValueChange={(value) => 
                        setColumnMapping(prev => ({ ...prev, company_linkedin_id: value }))
                      }
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
                  onClick={reset}
                >
                  Nouveau fichier
                </Button>
                <Button
                  onClick={handleImportClick}
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
