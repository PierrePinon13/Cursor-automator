import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, MapPin, User, ExternalLink, Building, Phone, Crown, Send, AlertTriangle, Linkedin, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';
import PhoneContactStatus from './PhoneContactStatus';
import CompanyHoverCard from './CompanyHoverCard';
import FeedbackDialog from './FeedbackDialog';
import AppointmentBookingDialog from './AppointmentBookingDialog';

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
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { retrievePhone, loading: phoneLoading } = usePhoneRetrieval();

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

  const handleMauvaisCiblageClick = () => {
    console.log('🎯 Mauvais ciblage button clicked for lead:', lead.id);
    setShowFeedbackDialog(true);
    console.log('🎯 showFeedbackDialog set to true');
  };

  const handleFeedbackSubmitted = () => {
    console.log('🎯 Feedback submitted for lead:', lead.id);
    setShowFeedbackDialog(false);
    onActionCompleted();
  };

  const handleAppointmentBooked = () => {
    setShowAppointmentDialog(false);
    onActionCompleted();
  };

  const companyName = lead.company_name || lead.unipile_company;
  const companyId = lead.company_id;
  const isMessageTooLong = customMessage.length > 300;
  const hasLinkedInMessage = !!lead.linkedin_message_sent_at;
  const charactersRemaining = 300 - customMessage.length;
  const hasBookedAppointment = !!lead.has_booked_appointment;
  const hasPositiveResponse = !!lead.positive_response_at;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Alert entreprise cliente - Affichage spécifique des entreprises */}
      {lead.has_previous_client_company && lead.previous_client_companies?.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-300 p-3 mx-6 mt-4 rounded">
          <div className="flex items-start gap-2 text-yellow-800">
            <Crown className="h-4 w-4 mt-0.5" />
            <div>
              <span className="font-medium">Entreprise cliente précédente détectée !</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {lead.previous_client_companies.map((company: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-200">
                    {company}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert RDV programmé */}
      {hasBookedAppointment && (
        <div className="bg-green-100 border border-green-300 p-3 mx-6 mt-4 rounded">
          <div className="flex items-start gap-2 text-green-800">
            <CheckCircle className="h-4 w-4 mt-0.5" />
            <div>
              <span className="font-medium">Rendez-vous programmé !</span>
              {lead.appointment_booked_at && (
                <p className="text-sm mt-1">
                  Programmé le {new Date(lead.appointment_booked_at).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
              ) : (
                <div className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                  Poste de recrutement détecté
                </div>
              )}
            </div>

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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
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
        <div className="w-1/3 bg-white border-r border-gray-200 p-6">
          <div className="h-full flex flex-col">
            <div className="border-b border-gray-100 pb-4 mb-6">
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
              
              <Button
                onClick={onSendLinkedInMessage}
                disabled={messageSending || isMessageTooLong || !customMessage.trim() || hasLinkedInMessage}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {messageSending ? 'Envoi en cours...' : 
                 hasLinkedInMessage ? 'Message déjà envoyé' : 
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

            {/* Planifier un rappel */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <Button
                onClick={() => onAction('schedule_reminder')}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                size="lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Planifier un rappel
              </Button>
            </div>

            {/* Bouton discret - RDV programmé */}
            {!hasBookedAppointment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <Button
                  onClick={() => setShowAppointmentDialog(true)}
                  variant="outline"
                  className="w-full h-10 text-emerald-700 border-emerald-300 hover:bg-emerald-100 text-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marquer RDV programmé
                </Button>
              </div>
            )}

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
                  onClick={handleMauvaisCiblageClick}
                  variant="outline"
                  className="w-full h-10 justify-start bg-white hover:bg-red-50 border-red-200"
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                  Mauvais ciblage
                </Button>
                
                <Button
                  onClick={() => onAction('hr_provider')}
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

      {/* Dialogues */}
      <FeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        lead={lead}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />

      <AppointmentBookingDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        lead={lead}
        onAppointmentBooked={handleAppointmentBooked}
      />

      {/* Debug info */}
      <div className="text-xs text-gray-500 fixed bottom-4 right-4 bg-white p-2 rounded shadow border">
        🎯 Debug: showFeedbackDialog = {showFeedbackDialog.toString()}
      </div>
    </div>
  );
};

export default LeadDetailContent;
