
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientContacts } from '@/hooks/useClientContacts';
import { ContactWorkHistory } from './ContactWorkHistory';
import { Loader2, User, Mail, Phone, Briefcase, Globe, FileText, ArrowLeft, Trash2, Building } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contact?: any;
}

export function ContactDialog({ open, onOpenChange, clientId, contact }: ContactDialogProps) {
  const { createContact, updateContact, deleteContact, extractingLinkedIn } = useClientContacts(clientId);
  const [step, setStep] = useState<'linkedin' | 'details'>(contact ? 'details' : 'linkedin');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    linkedin_url: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        position: contact.position || '',
        linkedin_url: contact.linkedin_url || '',
        notes: contact.notes || ''
      });
      setStep('details');
    } else {
      resetForm();
    }
  }, [contact, open]);

  const resetForm = () => {
    setStep('linkedin');
    setLinkedinUrl('');
    setExtractedData(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      linkedin_url: '',
      notes: ''
    });
  };

  const handleLinkedInExtraction = async () => {
    if (!linkedinUrl.trim()) return;

    setExtracting(true);
    try {
      console.log('🔗 Starting LinkedIn extraction for URL:', linkedinUrl);

      // Appeler la fonction d'extraction Unipile
      const response = await fetch(`https://csilkrfizphtbmevlkme.supabase.co/functions/v1/unipile-contact-scraper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaWxrcmZpenBodGJtZXZsa21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzE3MjksImV4cCI6MjA2Mzg0NzcyOX0.4jzjSkQVa1COccnCtdar3PkOnBBhX5xHRul1qk7Zbls`
        },
        body: JSON.stringify({
          contact_id: 'temp',
          profile_url: linkedinUrl
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'extraction LinkedIn');
      }

      const result = await response.json();
      console.log('✅ LinkedIn extraction result:', result);

      if (result.success && result.extracted_data) {
        const data = result.extracted_data.unipile_data;
        
        // Pré-remplir le formulaire avec les données extraites
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone_numbers?.[0] || '',
          position: data.headline || '',
          linkedin_url: linkedinUrl,
          notes: ''
        });
        
        setExtractedData(data);
        setStep('details');
      } else {
        // Si l'extraction échoue, on passe quand même à l'étape suivante avec l'URL
        setFormData(prev => ({ ...prev, linkedin_url: linkedinUrl }));
        setStep('details');
      }

    } catch (error) {
      console.error('❌ Error extracting LinkedIn data:', error);
      // En cas d'erreur, on passe quand même à l'étape suivante
      setFormData(prev => ({ ...prev, linkedin_url: linkedinUrl }));
      setStep('details');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (contact) {
        await updateContact(contact.id, formData);
      } else {
        await createContact({
          client_id: clientId,
          ...formData
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    
    setLoading(true);
    try {
      await deleteContact(contact.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting contact:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const goBackToLinkedIn = () => {
    setStep('linkedin');
    setExtractedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {contact ? 'Modifier le contact' : 'Nouveau contact'}
            {step === 'details' && !contact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBackToLinkedIn}
                className="ml-auto h-6 w-6 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {contact && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer le contact</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer {contact.first_name} {contact.last_name} ? 
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Étape 1: Extraction LinkedIn */}
        {step === 'linkedin' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Globe className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">Extraction LinkedIn</h3>
              <p className="text-sm text-gray-600 mb-4">
                Collez l'URL du profil LinkedIn pour pré-remplir automatiquement les informations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_url">URL LinkedIn *</Label>
              <Input
                id="linkedin_url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                type="url"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleLinkedInExtraction}
                disabled={extracting || !linkedinUrl.trim()}
                className="flex-1"
              >
                {extracting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {extracting ? 'Extraction...' : 'Extraire'}
              </Button>
            </div>

            <div className="text-center pt-2">
              <Button
                variant="link"
                size="sm"
                onClick={() => setStep('details')}
                className="text-sm text-gray-500"
              >
                Passer cette étape
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2: Détails du contact */}
        {step === 'details' && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Informations de base</TabsTrigger>
              <TabsTrigger value="history" disabled={!contact}>
                <Building className="h-4 w-4 mr-2" />
                Historique professionnel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              {extractedData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Données extraites de LinkedIn avec succès !
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nom et Prénom */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      required
                      placeholder="Jean"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      required
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                {/* URL LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url_display" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    URL LinkedIn
                  </Label>
                  <Input
                    id="linkedin_url_display"
                    value={formData.linkedin_url}
                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    type="url"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="jean.dupont@example.com"
                  />
                </div>

                {/* Téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                {/* Poste */}
                <div className="space-y-2">
                  <Label htmlFor="position" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Poste
                  </Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="Directeur des Ressources Humaines"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Notes personnelles sur ce contact..."
                    rows={3}
                  />
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !formData.first_name || !formData.last_name}
                    className="flex-1"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {contact ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="history">
              {contact && <ContactWorkHistory contactId={contact.id} contact={contact} />}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
