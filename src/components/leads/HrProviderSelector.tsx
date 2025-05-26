import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useHrProviders } from '@/hooks/useHrProviders';
import { getLastThreeCompanies } from '@/utils/unipileDataExtractor';
import { Building2, Plus } from 'lucide-react';

interface Lead {
  id: string;
  author_name: string;
  unipile_response?: any;
}

interface HrProviderSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onHrProviderSelected: (hrProviderId: string) => void;
}

export function HrProviderSelector({ 
  open, 
  onOpenChange, 
  lead, 
  onHrProviderSelected 
}: HrProviderSelectorProps) {
  const { hrProviders, createHrProvider } = useHrProviders();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract company names from Unipile data
  const recentCompanies = getLastThreeCompanies(lead.unipile_response);

  const handleCreateFromCompany = async (companyName: string) => {
    setLoading(true);
    try {
      const newProvider = await createHrProvider({
        company_name: companyName,
        company_linkedin_url: null,
        company_linkedin_id: null
      });
      
      if (newProvider) {
        onHrProviderSelected(newProvider.id);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating HR provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!newProviderName.trim()) return;
    
    setLoading(true);
    try {
      const newProvider = await createHrProvider({
        company_name: newProviderName.trim(),
        company_linkedin_url: null,
        company_linkedin_id: null
      });
      
      if (newProvider) {
        onHrProviderSelected(newProvider.id);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating HR provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExisting = (hrProviderId: string) => {
    onHrProviderSelected(hrProviderId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sélectionner un prestataire RH pour {lead.author_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recent companies from Unipile */}
          {recentCompanies.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                Entreprises récentes (données Unipile)
              </h3>
              <div className="grid gap-2">
                {recentCompanies.map((company, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {index === 0 ? 'Actuel' : `Précédent ${index}`}
                      </Badge>
                      <span className="font-medium">{company}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateFromCompany(company)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Créer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing HR providers */}
          {hrProviders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                Prestataires RH existants
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {hrProviders.map((provider) => (
                  <div 
                    key={provider.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectExisting(provider.id)}
                  >
                    <span className="font-medium">{provider.company_name}</span>
                    <Button size="sm" variant="outline">
                      Sélectionner
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom creation form */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              Créer un nouveau prestataire RH
            </h3>
            {!showCreateForm ? (
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un nouveau prestataire
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="company_name">Nom de l'entreprise</Label>
                  <Input
                    id="company_name"
                    value={newProviderName}
                    onChange={(e) => setNewProviderName(e.target.value)}
                    placeholder="Nom de l'entreprise"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateCustom}
                    disabled={!newProviderName.trim() || loading}
                    className="flex-1"
                  >
                    Créer
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProviderName('');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
