
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
import ReminderDialog from './ReminderDialog';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import { useEffect, useState } from 'react';

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
  const { sendMessage, loading: linkedInSending } = useLinkedInMessage();
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // Générer le message d'approche avec OpenAI au chargement
  useEffect(() => {
    const generateApproachMessage = async () => {
      if (!lead.approach_message || lead.approach_message === '') {
        console.log('🤖 Generating approach message for lead:', lead.id);
        setIsGeneratingMessage(true);
        
        try {
          const { data, error } = await supabase.functions.invoke('regenerate-approach-message', {
            body: { 
              leadId: lead.id,
              regenerate: false // Générer seulement si pas déjà existant
            }
          });

          if (error) {
            console.error('Error generating approach message:', error);
          } else if (data?.approach_message) {
            onMessageChange(data.approach_message);
            console.log('✅ Approach message generated successfully');
          }
        } catch (error) {
          console.error('Error calling regenerate-approach-message:', error);
        } finally {
          setIsGeneratingMessage(false);
        }
      } else {
        // Utiliser le message existant
        onMessageChange(lead.approach_message);
      }
    };

    generateApproachMessage();
  }, [lead.id, lead.approach_message, onMessageChange]);

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
          author_profile_url: lead.author_profile_url,
          reason: 'Publication signalée comme mal ciblée',
          reported_by_user_id: user.id,
          reported_by_user_name: user.user_metadata?.full_name || user.email
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

  const handleHrProvider = async () => {
    try {
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour effectuer cette action",
          variant: "destructive",
        });
        return;
      }

      // Ajouter à la liste des prestataires RH
      await supabase
        .from('hr_providers')
        .insert({
          lead_id: lead.id,
          author_name: lead.author_name,
          author_profile_url: lead.author_profile_url,
          company_name: lead.company_name || lead.unipile_company,
          reported_by_user_id: user.id,
          reported_by_user_name: user.user_metadata?.full_name || user.email,
          reason: 'Signalé comme prestataire RH'
        });
      
      toast({
        title: "Prestataire RH signalé",
        description: "Cette personne a été ajoutée à la liste des prestataires RH",
      });
      
      onAction('hr_provider');
    } catch (error) {
      console.error('Error reporting HR provider:', error);
      toast({
        title: "Erreur",
        description: "Impossible de signaler ce prestataire RH",
        variant: "destructive",
      });
    }
  };

  // Utiliser la fonction sendMessage correcte pour LinkedIn
  const handleSendLinkedInMessage = async () => {
    if (!customMessage.trim()) {
      toast({
        title: "Erreur",
        description: "Le message ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    if (customMessage.length > 300) {
      toast({
        title: "Erreur",
        description: "Le message dépasse la limite de 300 caractères",
        variant: "destructive",
      });
      return;
    }

    const success = await sendMessage(lead.id, customMessage, {
      author_name: lead.author_name,
      author_profile_url: lead.author_profile_url
    });

    if (success) {
      onActionCompleted();
      toast({
        title: "Message envoyé",
        description: "Votre message LinkedIn a été envoyé avec succès",
      });
    }
  };

  const companyName = lead.company_name || lead.unipile_company;
  const companyId = lead.company_id;
  const isMessageTooLong = customMessage.length > 300;
  const hasLinkedInMessage = !!lead.linkedin_message_sent_at;
  const charactersRemaining = 300 - customMessage.length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Layout 3 colonnes */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLONNE GAUCHE - Poste recherché + Publication */}
        <div className="w-1/3 bg-white p-6 border-r border-gray-200">
          <div className="space-y-6">
            {/* Encart vert - Poste recherché */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-green-800">Poste recherché</h3>
              </div>
              
              {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 ? (
                <div className="space-y-2">
                  {lead.openai_step3_postes_selectionnes.map((poste: string, index: number) => (
                    <div key={index} className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                      {poste}
                    </div>
                  ))}
                </div>
              ) : lead.openai_step3_categorie && lead.openai_step3_categorie !== 'Autre' ? (
                <div className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                  {lead.openai_step3_categorie}
                </div>
              ) : (
                <div className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                  Poste de recrutement détecté
                </div>
              )}
            </div>

            {/* Encart d'alerte pour entreprise cliente */}
            {lead.has_previous_client_company && (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Entreprise cliente détectée</h4>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  Cette personne a travaillé dans une de vos entreprises clientes :
                </p>
                <div className="space-y-1">
                  {lead.previous_client_companies?.map((company: string, index: number) => (
                    <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      🏢 {company}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Publication LinkedIn */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                    <Linkedin className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Publication LinkedIn</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">Contenu de la publication</p>
              </div>
              <div className="p-4">
                {/* Affichage correct du contenu de la publication */}
                {lead.text && lead.text !== 'Content unavailable' && lead.text.trim() !== '' ? (
                  <div className="text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {lead.text}
                  </div>
                ) : lead.title && lead.title.trim() !== '' ? (
                  <div className="text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto">
                    <strong>Titre :</strong> {lead.title}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-8">
                    <AlertTriangle className="h-4 w-4 mx-auto mb-2 text-orange-500" />
                    Contenu de la publication non disponible
                    <br />
                    <span className="text-xs">Cliquez sur "Voir la publication" pour consulter sur LinkedIn</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lien vers la publication */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => window.open(lead.url || lead.latest_post_url, '_blank')}
                disabled={!lead.url && !lead.latest_post_url}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir la publication
              </Button>
              {(!lead.url && !lead.latest_post_url) && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Lien non disponible
                </p>
              )}
            </div>
          </div>
        </div>

        {/* COLONNE CENTRE - Message d'approche */}
        <div className="w-1/3 bg-white border-r border-gray-200 p-6">
          <div className="h-full flex flex-col">
            <div className="border-b border-gray-100 pb-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Message d'approche</h3>
                {isGeneratingMessage && (
                  <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {isGeneratingMessage ? 'Génération du message personnalisé...' : 'Personnalisez votre message LinkedIn'}
              </p>
            </div>
            
            <div className="flex-1 flex flex-col">
              <div className="flex-1 mb-4">
                <Textarea
                  value={customMessage}
                  onChange={(e) => onMessageChange(e.target.value)}
                  placeholder={isGeneratingMessage ? "Génération en cours..." : "Rédigez votre message LinkedIn personnalisé..."}
                  className="w-full h-full resize-none border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isGeneratingMessage}
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
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE - Actions */}
        <div className="w-1/3 bg-white p-6">
          <div className="h-full flex flex-col space-y-4">
            {/* Message LinkedIn - En haut */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Linkedin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Message LinkedIn</h4>
                  <p className="text-xs text-blue-700">Action principale</p>
                </div>
              </div>
              
              {/* Bouton LinkedIn cliquable avec la bonne fonction */}
              <Button
                onClick={handleSendLinkedInMessage}
                disabled={linkedInSending || isMessageTooLong || !customMessage.trim() || hasLinkedInMessage || isGeneratingMessage}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {linkedInSending ? 'Envoi en cours...' : 
                 hasLinkedInMessage ? 'Message déjà envoyé' : 
                 isGeneratingMessage ? 'Génération...' :
                 'Envoyer le message LinkedIn'}
              </Button>
              
              {hasLinkedInMessage && (
                <div className="text-xs text-green-600 text-center mt-2">
                  Message envoyé le {new Date(lead.linkedin_message_sent_at!).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>

            {/* Récupérer le téléphone */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              {!lead.phone_number ? (
                <Button
                  onClick={handleRetrievePhone}
                  disabled={phoneLoading}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                  size="lg"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {phoneLoading ? 'Recherche...' : 'Récupérer le téléphone'}
                </Button>
              ) : (
                <PhoneContactStatus
                  leadId={lead.id}
                  phoneNumber={lead.phone_number}
                  currentStatus={lead.phone_contact_status}
                  onStatusUpdate={() => onContactUpdate?.()}
                />
              )}
            </div>

            {/* Planifier un rappel avec dialog */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <Button
                onClick={() => setReminderDialogOpen(true)}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                size="lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Planifier un rappel
              </Button>
            </div>

            {/* Section Signalement */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-orange-100 rounded">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <h4 className="font-semibold text-orange-800">Signalement</h4>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={handleMistargetedPost}
                  variant="outline"
                  className="w-full h-10 justify-start bg-white hover:bg-orange-50 border-orange-200"
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                  Publication mal ciblée
                </Button>
                
                <Button
                  onClick={handleHrProvider}
                  variant="outline"
                  className="w-full h-10 justify-start bg-white hover:bg-orange-50 border-orange-200"
                >
                  <Building className="h-4 w-4 mr-2 text-orange-600" />
                  Prestataire RH
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de rappel */}
      <ReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        leadId={lead.id}
        leadName={lead.author_name}
      />
    </div>
  );
};

export default LeadDetailContent;
