
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, MapPin, User, ExternalLink, Building, Phone, Crown, Send, AlertTriangle, Linkedin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';
import PhoneContactStatus from './PhoneContactStatus';
import CompanyHoverCard from './CompanyHoverCard';

interface LeadDetailContentProps {
  lead: any;
  onActionCompleted: () => void;
  isAdmin?: boolean;
  customMessage: string;
  onMessageChange: (message: string) => void;
  onSendLinkedInMessage: () => void;
  onAction: (actionName: string) => void;
  messageSending: boolean;
  onPhoneRetrieved?: (phoneNumber: string | null) => void;
  onContactUpdate?: () => void;
}

const LeadDetailContent = ({ 
  lead, 
  onActionCompleted, 
  isAdmin,
  customMessage,
  onMessageChange,
  onSendLinkedInMessage,
  onAction,
  messageSending,
  onPhoneRetrieved,
  onContactUpdate
}: LeadDetailContentProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { retrievePhone, loading: phoneLoading } = usePhoneRetrieval();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const handleRetrievePhone = async () => {
    try {
      const phoneNumber = await retrievePhone(lead.id);
      onPhoneRetrieved?.(phoneNumber);
      toast({
        title: phoneNumber ? "Téléphone récupéré" : "Téléphone non trouvé",
        description: phoneNumber ? `Numéro : ${phoneNumber}` : "Aucun numéro de téléphone trouvé pour ce lead",
      });
    } catch (error) {
      console.error('Error retrieving phone:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer le numéro de téléphone",
        variant: "destructive",
      });
    }
  };

  const handleMistargetedPost = async () => {
    try {
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour effectuer cette action",
          variant: "destructive",
        });
        return;
      }

      await supabase
        .from('mistargeted_posts')
        .insert({
          lead_id: lead.id,
          author_name: lead.author_name,
          reason: 'Publication signalée comme mal ciblée',
          reported_by_user_id: user.id
        });
      
      toast({
        title: "Publication signalée",
        description: "Cette publication a été signalée comme mal ciblée",
      });
      
      onAction('mistargeted_post');
    } catch (error) {
      console.error('Error reporting mistargeted post:', error);
      toast({
        title: "Erreur",
        description: "Impossible de signaler cette publication",
        variant: "destructive",
      });
    }
  };

  const companyName = lead.company_name || lead.unipile_company;
  const companyId = lead.company_id;
  const isMessageTooLong = customMessage.length > 300;
  const hasLinkedInMessage = !!lead.linkedin_message_sent_at;
  const charactersRemaining = 300 - customMessage.length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Alert entreprise cliente */}
      {lead.has_previous_client_company && (
        <div className="bg-yellow-100 border border-yellow-300 p-3 mx-6 mt-4 rounded">
          <div className="flex items-center gap-2 text-yellow-800">
            <Crown className="h-4 w-4" />
            <span className="font-medium">Entreprise cliente précédente détectée !</span>
          </div>
        </div>
      )}

      {/* Layout 3 colonnes */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLONNE GAUCHE - Poste recherché + Publication */}
        <div className="w-1/3 bg-gray-50 p-6">
          <div className="space-y-6">
            {/* Encart vert - Poste recherché */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-green-800">Poste recherché</h3>
              </div>
              <p className="text-sm text-green-700 mb-2">Postes identifiés par l'IA</p>
              
              {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 ? (
                <div className="space-y-2">
                  {lead.openai_step3_postes_selectionnes.map((poste: string, index: number) => (
                    <div key={index} className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                      {poste}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                  Poste de recrutement détecté
                </div>
              )}
            </div>

            {/* Publication LinkedIn */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="border-b p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                    <Linkedin className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Publication LinkedIn</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">Contenu de la publication</p>
              </div>
              <div className="p-4">
                {lead.text ? (
                  <div className="text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto">
                    {lead.text}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-8">
                    Aucun texte disponible
                  </div>
                )}
              </div>
            </div>

            {/* Lien vers la publication */}
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => window.open(lead.latest_post_url || lead.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir la publication
              </Button>
            </div>
          </div>
        </div>

        {/* COLONNE CENTRE - Message d'approche */}
        <div className="w-1/3 bg-white border-r border-l p-6">
          <div className="h-full flex flex-col">
            <div className="border-b pb-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Message d'approche</h3>
              </div>
              <p className="text-sm text-gray-600">Personnalisez votre message LinkedIn</p>
            </div>
            
            <div className="flex-1 flex flex-col">
              <div className="flex-1 mb-4">
                <Textarea
                  value={customMessage}
                  onChange={(e) => onMessageChange(e.target.value)}
                  placeholder="Rédigez votre message LinkedIn personnalisé..."
                  className="w-full h-full resize-none border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-3">
                <div className="text-sm">
                  <span className={charactersRemaining < 0 ? 'text-red-500 font-medium' : 'text-gray-500'}>
                    {charactersRemaining < 0 ? `Dépassement de ${Math.abs(charactersRemaining)} caractères` : `${charactersRemaining} caractères restants`}
                  </span>
                </div>

                {hasLinkedInMessage && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">
                    ✓ Message envoyé le {new Date(lead.linkedin_message_sent_at!).toLocaleDateString('fr-FR')}
                  </div>
                )}

                <Button
                  onClick={onSendLinkedInMessage}
                  disabled={messageSending || isMessageTooLong || !customMessage.trim() || hasLinkedInMessage}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {messageSending ? 'Envoi en cours...' : 
                   hasLinkedInMessage ? 'Message déjà envoyé' : 
                   'Envoyer le message LinkedIn'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE - Actions */}
        <div className="w-1/3 bg-gray-50 p-6">
          <div className="h-full flex flex-col">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h3 className="font-semibold text-gray-900">Actions</h3>
              <p className="text-sm text-gray-600 mt-1">Gérer ce lead</p>
            </div>
            
            <div className="space-y-4 flex-1">
              {/* Informations du lead */}
              <div className="bg-white rounded-lg border shadow-sm">
                <div className="border-b p-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Informations du lead
                  </h4>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Nom :</span>
                    <span className="ml-2 font-medium">{lead.author_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Poste :</span>
                    <span className="ml-2 font-medium">{lead.unipile_position || 'Non disponible'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date :</span>
                    <span className="ml-2 font-medium">{formatDate(lead.latest_post_date)}</span>
                  </div>
                </div>
              </div>

              {/* Récupérer téléphone */}
              {!lead.phone_number ? (
                <Button
                  onClick={handleRetrievePhone}
                  disabled={phoneLoading}
                  variant="outline"
                  className="w-full h-12"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {phoneLoading ? 'Recherche...' : 'Récupérer le téléphone'}
                </Button>
              ) : (
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <PhoneContactStatus
                    leadId={lead.id}
                    phoneNumber={lead.phone_number}
                    currentStatus={lead.phone_contact_status}
                    onStatusUpdate={() => onContactUpdate?.()}
                  />
                </div>
              )}

              {/* Planifier un rappel */}
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => onAction('schedule_reminder')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Planifier un rappel
              </Button>
            </div>

            {/* Section Signalement */}
            <div className="mt-auto pt-6">
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Signalement</h4>
                
                <div className="space-y-3">
                  <Button
                    onClick={handleMistargetedPost}
                    variant="outline"
                    className="w-full justify-start text-sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Publication mal ciblée
                  </Button>
                  
                  <Button
                    onClick={() => onAction('hr_provider')}
                    variant="outline"
                    className="w-full justify-start text-sm"
                  >
                    <Building className="h-4 w-4 mr-2" />
                    Prestataire RH
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailContent;
