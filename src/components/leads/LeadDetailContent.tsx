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
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const {
    retrievePhone,
    loading: phoneLoading
  } = usePhoneRetrieval();
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
  const companyName = lead.company_name || lead.unipile_company;
  const companyId = lead.company_id;
  const isMessageTooLong = customMessage.length > 300;
  const hasLinkedInMessage = !!lead.linkedin_message_sent_at;
  const charactersRemaining = 300 - customMessage.length;
  return <div className="h-full flex flex-col bg-gray-50">
      {/* Alert entreprise cliente - Affichage spécifique des entreprises */}
      {lead.has_previous_client_company && lead.previous_client_companies?.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-300 p-3 mx-6 mb-2 rounded">
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

      {/* Layout 3 colonnes - Espace réduit */}
      <div className="flex-1 flex overflow-hidden pt-2">
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
              
              {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 ? <div className="space-y-2">
                  {lead.openai_step3_postes_selectionnes.map((poste: string, index: number) => <div key={index} className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                      {poste}
                    </div>)}
                </div> : <div className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                  Poste de recrutement détecté
                </div>}
            </div>

            {/* Publication LinkedIn */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="border-b border-gray-100 p-4 py-[8px]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                    <Linkedin className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Publication LinkedIn</h3>
                </div>
                
              </div>
              <div className="p-4">
                {lead.text ? <div className="text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto">
                    {lead.text}
                  </div> : <div className="text-sm text-gray-500 text-center py-8">
                    Aucun texte disponible
                  </div>}
              </div>
            </div>

            {/* Lien vers la publication */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <Button variant="outline" className="w-full justify-center" onClick={() => window.open(lead.latest_post_url || lead.url, '_blank')}>
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
                <Textarea value={customMessage} onChange={e => onMessageChange(e.target.value)} placeholder="Rédigez votre message LinkedIn personnalisé..." className="w-full h-full resize-none border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              
              <div className="space-y-3">
                <div className="text-sm">
                  <span className={charactersRemaining < 0 ? 'text-red-500 font-medium' : 'text-gray-500'}>
                    {charactersRemaining < 0 ? `Dépassement de ${Math.abs(charactersRemaining)} caractères` : `${charactersRemaining} caractères restants`}
                  </span>
                </div>

                {hasLinkedInMessage && <div className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">
                    ✓ Message envoyé le {new Date(lead.linkedin_message_sent_at!).toLocaleDateString('fr-FR')}
                  </div>}
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE - Actions */}
        <div className="w-1/3 bg-white p-6">
          <div className="h-full flex flex-col space-y-4">
            {/* Message LinkedIn */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Linkedin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Message LinkedIn</h4>
                </div>
              </div>
              
              <Button
                onClick={onSendLinkedInMessage}
                disabled={messageSending || isMessageTooLong || !customMessage.trim() || hasLinkedInMessage}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {messageSending ? 'Envoi en cours...' : hasLinkedInMessage ? 'Message déjà envoyé' : 'Envoyer le message LinkedIn'}
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <Button
                onClick={() => setShowReminderDialog(true)}
                variant="outline"
                className="w-full h-10 justify-start bg-white hover:bg-yellow-50 border-yellow-200"
              >
                <div className="p-1 bg-yellow-100 rounded mr-3">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                </div>
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
                {/* Bouton Publication mal ciblée */}
                <MistargetedPostButton
                  lead={lead}
                  onFeedbackSubmitted={onActionCompleted}
                />

                {/* Bouton Cabinet de recrutement */}
                <RecruitmentAgencyButton lead={lead} onActionCompleted={onActionCompleted} />
              </div>
            </div>
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
    </div>;
};
export default LeadDetailContent;
