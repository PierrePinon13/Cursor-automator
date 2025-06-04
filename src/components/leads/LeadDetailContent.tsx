
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
      {/* Header bandeau bleu avec infos lead */}
      <div className="bg-blue-50 border-b p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-semibold text-gray-900">{lead.author_name || 'N/A'}</h2>
          <a
            href={lead.author_profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Linkedin className="h-5 w-5" />
          </a>
        </div>
        <div className="text-sm text-gray-600 flex items-center gap-1">
          {lead.unipile_position && (
            <span>{lead.unipile_position}</span>
          )}
          {lead.unipile_position && companyName && <span className="mx-1">@</span>}
          {companyName && (
            <CompanyHoverCard 
              companyId={companyId} 
              companyName={companyName}
            >
              <span className="font-medium text-blue-700 hover:text-blue-900 cursor-pointer hover:underline">
                {companyName}
              </span>
            </CompanyHoverCard>
          )}
        </div>

        {/* Alert entreprise cliente */}
        {lead.has_previous_client_company && (
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
            <div className="flex items-center gap-2 text-yellow-800">
              <Crown className="h-4 w-4" />
              <span className="font-medium">Entreprise cliente précédente détectée !</span>
            </div>
          </div>
        )}
      </div>

      {/* Layout 3 colonnes identique à l'ancienne version */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLONNE GAUCHE - Poste recherché + Publication LinkedIn */}
        <div className="w-1/3 bg-white p-4 border-r overflow-y-auto">
          {/* Poste recherché */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <h3 className="font-medium text-green-800">Poste recherché</h3>
            </div>
            <div className="text-sm text-green-700">
              {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 ? (
                <div>
                  <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium mb-2">
                    Postes identifiés par l'IA
                  </div>
                  {lead.openai_step3_postes_selectionnes.map((poste: string, index: number) => (
                    <div key={index} className="mb-1">{poste}</div>
                  ))}
                </div>
              ) : (
                <div>Poste de recrutement détecté</div>
              )}
            </div>
          </div>

          {/* Publication LinkedIn */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Linkedin className="h-4 w-4 text-blue-600" />
              <h3 className="font-medium text-blue-800">Publication LinkedIn</h3>
            </div>
            <div className="text-sm">
              <div className="text-gray-600 mb-2">Contenu de la publication</div>
              
              {lead.text ? (
                <div className="bg-white p-3 rounded border text-xs max-h-48 overflow-y-auto">
                  {lead.text}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  Aucun texte disponible
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLONNE CENTRE - Message d'approche */}
        <div className="w-1/3 bg-gray-50 p-4 border-r flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 bg-blue-100 rounded">
              <Send className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-medium">Message d'approche</h3>
          </div>
          <div className="text-xs text-gray-600 mb-3">Personnalisez votre message</div>
          
          <div className="flex-1 flex flex-col">
            <Textarea
              value={customMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Votre message LinkedIn..."
              className="flex-1 resize-none border-gray-300 bg-white text-sm"
            />
            
            <div className="mt-2 text-xs flex justify-between">
              <span className={charactersRemaining < 0 ? 'text-red-500' : 'text-gray-500'}>
                {charactersRemaining < 0 ? `Dépassement de ${Math.abs(charactersRemaining)} caractères` : `${charactersRemaining} caractères restants`}
              </span>
            </div>

            {hasLinkedInMessage && (
              <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                Message envoyé le {new Date(lead.linkedin_message_sent_at!).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE - Actions */}
        <div className="w-1/3 bg-white p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 bg-blue-100 rounded">
              <Linkedin className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-medium">Message LinkedIn</h3>
          </div>
          <div className="text-xs text-gray-600 mb-3">Action principale</div>

          {/* Bouton Envoyer message LinkedIn */}
          <Button
            onClick={onSendLinkedInMessage}
            disabled={messageSending || isMessageTooLong || !customMessage.trim() || hasLinkedInMessage}
            className="w-full mb-6 h-12 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            {messageSending ? 'Envoi en cours...' : 
             hasLinkedInMessage ? 'Message déjà envoyé' : 
             'Envoyer le message LinkedIn'}
          </Button>

          {/* Actions secondaires */}
          <div className="space-y-3">
            {/* Récupérer téléphone */}
            {!lead.phone_number ? (
              <Button
                onClick={handleRetrievePhone}
                disabled={phoneLoading}
                variant="outline"
                className="w-full justify-start"
              >
                <Phone className="h-4 w-4 mr-2 text-green-600" />
                {phoneLoading ? 'Recherche...' : 'Récupérer le téléphone'}
              </Button>
            ) : (
              <div className="bg-green-50 p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Téléphone: {lead.phone_number}</span>
                </div>
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
              className="w-full justify-start"
              onClick={() => onAction('schedule_reminder')}
            >
              <Calendar className="h-4 w-4 mr-2 text-purple-600" />
              Planifier un rappel
            </Button>
          </div>

          {/* Section Signalement */}
          <div className="mt-8 pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <h4 className="text-sm font-medium text-orange-800">Signalement</h4>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={handleMistargetedPost}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
              >
                <AlertTriangle className="h-3 w-3 mr-2" />
                Publication mal ciblée
              </Button>
              
              <Button
                onClick={() => onAction('hr_provider')}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
              >
                <Building className="h-3 w-3 mr-2" />
                Prestataire RH
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailContent;
