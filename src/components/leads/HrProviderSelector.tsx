
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useHrProviders } from '@/hooks/useHrProviders';
import { extractWorkExperiences } from '@/utils/unipileDataExtractor';
import { Building2, Plus } from 'lucide-react';

interface Lead {
  id: string;
  author_name: string;
  unipile_response?: any;
  unipile_company?: string;
  unipile_company_linkedin_id?: string;
  company_linkedin_id?: string;
  author_profile_url?: string;
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
  const [newProviderData, setNewProviderData] = useState({
    company_name: '',
    company_linkedin_url: '',
    company_linkedin_id: ''
  });
  const [loading, setLoading] = useState(false);

  // Extract work experiences from Unipile data as fallback
  const workExperiences = extractWorkExperiences(lead.unipile_response);
  const currentExperience = workExperiences.find(exp => exp.isCurrent) || workExperiences[0];
  
  // Get current company info - prioritize direct field over extracted data
  const currentCompanyName = lead.unipile_company || currentExperience?.company || '';
  
  // Use multiple sources for LinkedIn ID
  const currentCompanyLinkedInId = 
    lead.unipile_company_linkedin_id || 
    lead.company_linkedin_id || 
    (() => {
      console.log('Using fallback LinkedIn ID extraction from unipile_response');
      
      if (lead.unipile_response) {
        // Check work_experience structure first
        if (lead.unipile_response.work_experience) {
          const currentExp = lead.unipile_response.work_experience.find((exp: any) => 
            !exp.end || exp.end === null || exp.end === ''
          );
          console.log('Found current experience in work_experience:', currentExp);
          return currentExp?.company_id || null;
        }
        
        // Check linkedin_profile.experience structure
        if (lead.unipile_response.linkedin_profile?.experience) {
          const currentExp = lead.unipile_response.linkedin_profile.experience.find((exp: any) => 
            !exp.end || exp.end === null || exp.end === ''
          );
          console.log('Found current experience in linkedin_profile.experience:', currentExp);
          return currentExp?.company_id || null;
        }
      }
      
      return null;
    })();

  console.log('Current company data:', {
    name: currentCompanyName,
    linkedinId: currentCompanyLinkedInId,
    directField: lead.unipile_company_linkedin_id,
    companyLinkedInId: lead.company_linkedin_id,
    fromResponse: !!lead.unipile_response
  });

  const handleCreateFromCurrentCompany = async () => {
    if (!currentCompanyName) return;
    
    setLoading(true);
    try {
      const newProvider = await createHrProvider({
        company_name: currentCompanyName,
        company_linkedin_url: null,
        company_linkedin_id: currentCompanyLinkedInId
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
    if (!newProviderData.company_name.trim()) return;
    
    setLoading(true);
    try {
      const newProvider = await createHrProvider({
        company_name: newProviderData.company_name.trim(),
        company_linkedin_url: newProviderData.company_linkedin_url.trim() || null,
        company_linkedin_id: newProviderData.company_linkedin_id.trim() || null
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

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setNewProviderData({
      company_name: currentCompanyName,
      company_linkedin_url: '',
      company_linkedin_id: currentCompanyLinkedInId || ''
    });
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
          {/* Current company from lead data */}
          {currentCompanyName && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                Société actuelle du lead
              </h3>
              <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-blue-100">
                        Société actuelle
                      </Badge>
                    </div>
                    <div className="font-medium text-gray-900">{currentCompanyName}</div>
                    {currentCompanyLinkedInId && (
                      <div className="text-sm text-blue-600">
                        LinkedIn ID: {currentCompanyLinkedInId}
                      </div>
                    )}
                    {!currentCompanyLinkedInId && (
                      <div className="text-sm text-orange-600">
                        Aucun LinkedIn ID trouvé
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCreateFromCurrentCompany}
                    disabled={loading}
                    className="ml-4"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Créer prestataire
                  </Button>
                </div>
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
                onClick={handleShowCreateForm}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un nouveau prestataire
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="company_name">Nom de l'entreprise *</Label>
                  <Input
                    id="company_name"
                    value={newProviderData.company_name}
                    onChange={(e) => setNewProviderData(prev => ({ 
                      ...prev, 
                      company_name: e.target.value 
                    }))}
                    placeholder="Nom de l'entreprise"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_linkedin_url">URL LinkedIn de l'entreprise (optionnel)</Label>
                  <Input
                    id="company_linkedin_url"
                    value={newProviderData.company_linkedin_url}
                    onChange={(e) => setNewProviderData(prev => ({ 
                      ...prev, 
                      company_linkedin_url: e.target.value 
                    }))}
                    placeholder="https://www.linkedin.com/company/..."
                  />
                </div>
                <div>
                  <Label htmlFor="company_linkedin_id">ID LinkedIn de l'entreprise</Label>
                  <Input
                    id="company_linkedin_id"
                    value={newProviderData.company_linkedin_id}
                    onChange={(e) => setNewProviderData(prev => ({ 
                      ...prev, 
                      company_linkedin_id: e.target.value 
                    }))}
                    placeholder="ID LinkedIn"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateCustom}
                    disabled={!newProviderData.company_name.trim() || loading}
                    className="flex-1"
                  >
                    Créer
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProviderData({ 
                        company_name: '', 
                        company_linkedin_url: '', 
                        company_linkedin_id: '' 
                      });
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
