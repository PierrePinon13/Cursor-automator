
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHrProviders } from '@/hooks/useHrProviders';

interface HrProvider {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
}

interface HrProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hrProvider?: HrProvider | null;
}

export function HrProviderDialog({ open, onOpenChange, hrProvider }: HrProviderDialogProps) {
  const { createHrProvider, updateHrProvider } = useHrProviders();
  const [formData, setFormData] = useState({
    company_name: '',
    company_linkedin_url: '',
    company_linkedin_id: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hrProvider) {
      setFormData({
        company_name: hrProvider.company_name || '',
        company_linkedin_url: hrProvider.company_linkedin_url || '',
        company_linkedin_id: hrProvider.company_linkedin_id || ''
      });
    } else {
      setFormData({
        company_name: '',
        company_linkedin_url: '',
        company_linkedin_id: ''
      });
    }
  }, [hrProvider, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        company_name: formData.company_name,
        company_linkedin_url: formData.company_linkedin_url || null,
        company_linkedin_id: formData.company_linkedin_id || null
      };

      if (hrProvider) {
        await updateHrProvider(hrProvider.id, data);
      } else {
        await createHrProvider(data);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving HR provider:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {hrProvider ? 'Modifier le prestataire RH' : 'Nouveau prestataire RH'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de l'entreprise *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="Nom de l'entreprise"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_linkedin_url">URL LinkedIn</Label>
            <Input
              id="company_linkedin_url"
              value={formData.company_linkedin_url}
              onChange={(e) => setFormData(prev => ({ ...prev, company_linkedin_url: e.target.value }))}
              placeholder="https://www.linkedin.com/company/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_linkedin_id">ID LinkedIn</Label>
            <Input
              id="company_linkedin_id"
              value={formData.company_linkedin_id}
              onChange={(e) => setFormData(prev => ({ ...prev, company_linkedin_id: e.target.value }))}
              placeholder="ID LinkedIn"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : (hrProvider ? 'Modifier' : 'Créer')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
