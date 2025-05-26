
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, X } from 'lucide-react';
import { useClientImport } from '@/hooks/useClientImport';
import { useState, useRef, useEffect } from 'react';

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportClientsDialog({ open, onOpenChange }: ImportClientsDialogProps) {
  console.log('🎭 ImportClientsDialog rendering...', { open });
  
  const {
    csvData,
    columnMapping,
    setColumnMapping,
    loading,
    handleFileUpload,
    handleImport,
    reset,
  } = useClientImport();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('🔄 ImportClientsDialog state changed:', {
      csvData: csvData ? { headers: csvData.headers.length, rows: csvData.rows.length } : null,
      columnMapping,
      loading,
      isDragOver
    });
  }, [csvData, columnMapping, loading, isDragOver]);

  const handleFileSelect = (file: File) => {
    console.log('📁 File selected in dialog:', file.name);
    if (file && file.type === 'text/csv') {
      console.log('✅ Valid CSV file, calling handleFileUpload...');
      handleFileUpload(file);
    } else {
      console.error('❌ Invalid file type:', file.type);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📎 File input changed');
    const file = event.target.files?.[0];
    if (file) {
      console.log('📁 File from input:', file.name);
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('🔄 Drag over');
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('🔄 Drag leave');
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('📥 File dropped');
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    console.log('📂 Dropped files:', files.map(f => f.name));
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFile) {
      console.log('✅ Valid CSV file found:', csvFile.name);
      handleFileSelect(csvFile);
    } else {
      console.log('❌ No valid CSV file found in dropped files');
    }
  };

  const handleDialogClose = (open: boolean) => {
    console.log('🔄 Dialog closing:', open);
    onOpenChange(open);
    if (!open) {
      console.log('🧹 Resetting on dialog close');
      reset();
    }
  };

  const handleImportClick = async () => {
    console.log('🚀 Import button clicked');
    try {
      await handleImport();
      if (csvData && columnMapping.company_name) {
        console.log('✅ Import successful, closing dialog');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('❌ Error during import click:', error);
    }
  };

  const openFileDialog = () => {
    console.log('📂 Opening file dialog');
    fileInputRef.current?.click();
  };

  try {
    console.log('🎨 Rendering dialog content...');
    
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importer des clients depuis un CSV</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {!csvData ? (
              <div className="space-y-4">
                {/* Zone de drag and drop */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 rounded-full bg-gray-100">
                      <Upload className="h-8 w-8 text-gray-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        Glissez votre fichier CSV ici
                      </h3>
                      <p className="text-sm text-gray-500">
                        ou cliquez pour sélectionner un fichier
                      </p>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openFileDialog}
                      className="mt-4"
                      disabled={loading}
                    >
                      {loading ? 'Chargement...' : 'Choisir un fichier'}
                    </Button>
                  </div>
                </div>

                {/* Input file caché */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
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
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Fichier chargé : {csvData.rows.length} ligne(s) détectée(s)</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="text-green-700 hover:text-green-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Mapping des colonnes</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          setColumnMapping(prev => ({ 
                            ...prev, 
                            company_linkedin_url: value === '__none__' ? '' : value 
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optionnel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucune</SelectItem>
                          {csvData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>ID LinkedIn</Label>
                      <Select
                        value={columnMapping.company_linkedin_id}
                        onValueChange={(value) => 
                          setColumnMapping(prev => ({ 
                            ...prev, 
                            company_linkedin_id: value === '__none__' ? '' : value 
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optionnel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucune</SelectItem>
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
                    <div className="border rounded-md p-3 bg-gray-50 text-sm max-h-32 overflow-y-auto">
                      {csvData.rows.slice(0, 3).map((row, index) => (
                        <div key={index} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                          <strong>Ligne {index + 1}:</strong> {row.join(' | ')}
                        </div>
                      ))}
                      {csvData.rows.length > 3 && (
                        <div className="text-gray-500 italic">... et {csvData.rows.length - 3} ligne(s) de plus</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              {csvData && (
                <Button
                  onClick={handleImportClick}
                  disabled={loading || !columnMapping.company_name}
                >
                  {loading ? 'Import en cours...' : 'Importer'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  } catch (error) {
    console.error('💥 Error rendering ImportClientsDialog:', error);
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Erreur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-red-600">Une erreur est survenue lors du rendu du composant d'import.</p>
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
