
import React, { useState } from 'react';
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
import FeedbackDialog from './FeedbackDialog';
import RecruitmentAgencyButton from './RecruitmentAgencyButton';
import ReminderDialog from './ReminderDialog';
import MistargetedPostButton from './MistargetedPostButton';

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
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { retrievePhone, loading: phoneLoading } = usePhoneRetrieval();

  // Protection contre les données invalides
  if (!lead) {
    console.error('LeadDetailContent: lead is null or undefined');
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Erreur: Données du lead non disponibles</p>
        </div>
      </div>
    );
  }

  const handleRetrievePhone = async () => {
    try {
      const phoneNumber = await retrievePhone(lead.id);
      onPhoneRetrieved?.(phoneNumber);
      toast({
        title: phoneNumber ? "Téléphone récupéré" : "Téléphone non trouvé",
        description: phoneNumber ? `Numéro : ${phoneNumber}` : "Aucun numéro de téléphone trouvé pour ce lead"
      });
    } catch (error) {
      console.error('Error retrieving phone:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer le numéro de téléphone",
        variant: "destructive"
      });
    }
  };

  const companyName = lead.company_name || lead.unipile_company || 'Entreprise non renseignée';
  const companyId = lead.company_id;
  const isMessageTooLong = customMessage.length > 300;
  const hasLinkedInMessage = !!lead.linkedin_message_sent_at;
  const charactersRemaining = 300 - customMessage.length;

  // Protection pour les tableaux potentiellement undefined
  const previousClientCompanies = Array.isArray(lead.previous_client_companies) ? lead.previous_client_companies : [];
  const selectedPositions = Array.isArray(lead.openai_step3_postes_selectionnes) ? lead.openai_step3_postes_selectionnes : [];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Alert entreprise cliente - Affichage harmonisé */}
      {lead.has_previous_client_company && previousClientCompanies.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 mx-6 mb-4 rounded-lg">
          <div className="flex items-start gap-3 text-yellow-800">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Crown className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">Entreprise cliente précédente détectée</h3>
              <div className="flex flex-wrap gap-2">
                {previousClientCompanies.map((company: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-100">
                    {company}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout 3 colonnes harmonisé */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLONNE GAUCHE - Poste recherché + Publication */}
        <div className="w-1/3 bg-white border-r border-gray-200">
          <div className="p-6 space-y-6">
            {/* Encart vert - Poste recherché - Design harmonisé */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-green-800">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Building className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg">Poste recherché</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPositions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPositions.map((poste: string, index: number) => (
                      <div key={index} className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                        {poste}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium text-center">
                    {lead.openai_step3_categorie || 'Poste de recrutement détecté'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Publication LinkedIn - Design harmonisé */}
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-blue-800">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Linkedin className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg">Publication LinkedIn</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lead.text ? (
                  <div className="text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                    {lead.text}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                    Aucun texte disponible
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lien vers la publication - Design harmonisé */}
            <Button 
              variant="outline" 
              className="w-full h-12 justify-center border-blue-200 hover:bg-blue-50" 
              onClick={() => {
                const url = lead.latest_post_url || lead.url;
                if (url) {
                  window.open(url, '_blank');
                } else {
                  toast({
                    title: "Erreur",
                    description: "Aucun lien vers la publication disponible",
                    variant: "destructive"
                  });
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir la publication
            </Button>
          </div>
        </div>

        {/* COLONNE CENTRE - Message d'approche */}
        <div className="w-1/3 bg-white border-r border-gray-200">
          <div className="p-6 h-full flex flex-col">
            <div className="pb-4 mb-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Send className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Message d'approche</h3>
                  <p className="text-sm text-gray-600">Personnalisez votre message LinkedIn</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <div className="flex-1 mb-4">
                <Textarea 
                  value={customMessage || ''} 
                  onChange={e => onMessageChange(e.target.value)} 
                  placeholder="Rédigez votre message LinkedIn personnalisé..." 
                  className="w-full h-full resize-none border-gray-200 text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50" 
                />
              </div>
              
              <div className="space-y-3">
                <div className="text-sm text-center p-3 bg-gray-50 rounded-lg">
                  <span className={charactersRemaining < 0 ? 'text-red-500 font-medium' : 'text-gray-600'}>
                    {charactersRemaining < 0 ? `Dépassement de ${Math.abs(charactersRemaining)} caractères` : `${charactersRemaining} caractères restants`}
                  </span>
                </div>

                {hasLinkedInMessage && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                    ✓ Message envoyé le {lead.linkedin_message_sent_at ? new Date(lead.linkedin_message_sent_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE - Actions harmonisées */}
        <div className="w-1/3 bg-white">
          <div className="p-6 h-full flex flex-col space-y-4">
            {/* Message LinkedIn - Card harmonisée */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Linkedin className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-blue-900">Message LinkedIn</h4>
                </div>
                
                <Button
                  onClick={onSendLinkedInMessage}
                  disabled={messageSending || isMessageTooLong || !customMessage?.trim() || hasLinkedInMessage}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {messageSending ? 'Envoi en cours...' : hasLinkedInMessage ? 'Message déjà envoyé' : 'Envoyer le message'}
                </Button>
                
                {hasLinkedInMessage && lead.linkedin_message_sent_at && (
                  <div className="text-xs text-green-600 text-center mt-2">
                    Message envoyé le {new Date(lead.linkedin_message_sent_at).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Récupérer le téléphone - Card harmonisée */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
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
              </CardContent>
            </Card>

            {/* Planifier un rappel - Card harmonisée */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <Button
                  onClick={() => setShowReminderDialog(true)}
                  variant="outline"
                  className="w-full h-12 justify-start bg-white hover:bg-yellow-50 border-yellow-200"
                >
                  <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                    <Calendar className="h-4 w-4 text-yellow-600" />
                  </div>
                  <span className="font-medium">Planifier un rappel</span>
                </Button>
              </CardContent>
            </Card>

            {/* Section Signalement - Card harmonisée */}
            <Card className="border-orange-200 bg-orange-50 flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-orange-800">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <span>Signalement</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Bouton Publication mal ciblée */}
                <MistargetedPostButton
                  lead={lead}
                  onFeedbackSubmitted={onActionCompleted}
                />

                {/* Bouton Cabinet de recrutement */}
                <RecruitmentAgencyButton lead={lead} onActionCompleted={onActionCompleted} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogue de rappel */}
      <ReminderDialog
        open={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        leadId={lead.id}
        leadName={lead.author_name || 'Lead sans nom'}
      />
    </div>
  );
};

export default LeadDetailContent;
