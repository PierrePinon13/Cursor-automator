
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClients } from '@/hooks/useClients';

interface Client {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  users: User[];
}

export function ClientDialog({ open, onOpenChange, client, users }: ClientDialogProps) {
  const { createClient, updateClient } = useClients();
  const [formData, setFormData] = useState({
    company_name: '',
    company_linkedin_url: '',
    company_linkedin_id: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        company_name: client.company_name,
        company_linkedin_url: client.company_linkedin_url || '',
        company_linkedin_id: client.company_linkedin_id || '',
      });
    } else {
      setFormData({
        company_name: '',
        company_linkedin_url: '',
        company_linkedin_id: '',
      });
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clientData = {
        company_name: formData.company_name,
        company_linkedin_url: formData.company_linkedin_url || null,
        company_linkedin_id: formData.company_linkedin_id || null,
      };

      if (client) {
        await updateClient(client.id, clientData);
      } else {
        await createClient(clientData);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Modifier le client' : 'Nouveau client'}
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
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_linkedin_id">ID LinkedIn</Label>
            <Input
              id="company_linkedin_id"
              value={formData.company_linkedin_id}
              onChange={(e) => setFormData(prev => ({ ...prev, company_linkedin_id: e.target.value }))}
              placeholder="ID LinkedIn de l'entreprise"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : (client ? 'Modifier' : 'Créer')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
