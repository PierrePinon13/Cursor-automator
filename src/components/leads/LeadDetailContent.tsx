
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
        <div className="bg-yellow-100 border border-yellow-300 p-3 mx-4 mt-4 rounded">
          <div className="flex items-center gap-2 text-yellow-800">
            <Crown className="h-4 w-4" />
            <span className="font-medium">Entreprise cliente précédente détectée !</span>
          </div>
        </div>
      )}

      {/* Layout 3 colonnes */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLONNE GAUCHE - Infos lead + Poste recherché + Publication LinkedIn */}
        <div className="w-1/3 bg-gray-50 p-6 border-r overflow-y-auto">
          {/* Infos lead */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Informations du lead
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Nom</div>
                <div className="text-base">{lead.author_name || 'N/A'}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-600">Poste actuel</div>
                <div className="text-base">{lead.unipile_position || 'Non disponible'}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-600">Entreprise actuelle</div>
                <div className="text-base">
                  {companyName ? (
                    <CompanyHoverCard 
                      companyId={companyId} 
                      companyName={companyName}
                    >
                      <span className="text-blue-700 hover:text-blue-900 cursor-pointer hover:underline">
                        {companyName}
                      </span>
                    </CompanyHoverCard>
                  ) : 'Non disponible'}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-600">Profil LinkedIn</div>
                <div className="text-base">
                  <a
                    href={lead.author_profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    <Linkedin className="h-4 w-4" />
                    Voir le profil
                  </a>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-600">Date de publication</div>
                <div className="text-base">{formatDate(lead.latest_post_date)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Poste recherché */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5 text-green-600" />
                Poste recherché
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 ? (
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    Postes identifiés par l'IA
                  </Badge>
                  <div className="space-y-1">
                    {lead.openai_step3_postes_selectionnes.map((poste: string, index: number) => (
                      <div key={index} className="text-sm bg-green-50 p-2 rounded border border-green-200">
                        {poste}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">Poste de recrutement détecté</div>
              )}
            </CardContent>
          </Card>

          {/* Publication LinkedIn */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Linkedin className="h-5 w-5 text-blue-600" />
                Publication LinkedIn
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.text ? (
                <div className="text-sm bg-white p-3 rounded border max-h-64 overflow-y-auto">
                  {lead.text}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  Aucun texte disponible
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLONNE CENTRE - Message d'approche */}
        <div className="w-1/3 bg-white p-6 border-r flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <Send className="h-5 w-5 text-blue-600" />
              Message d'approche
            </h3>
            <p className="text-sm text-gray-600">Personnalisez votre message LinkedIn</p>
          </div>
          
          <div className="flex-1 flex flex-col">
            <Textarea
              value={customMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Votre message LinkedIn..."
              className="flex-1 resize-none border-gray-300 text-sm"
            />
            
            <div className="mt-3 flex justify-between items-center text-xs">
              <span className={charactersRemaining < 0 ? 'text-red-500' : 'text-gray-500'}>
                {charactersRemaining < 0 ? `Dépassement de ${Math.abs(charactersRemaining)} caractères` : `${charactersRemaining} caractères restants`}
              </span>
            </div>

            {hasLinkedInMessage && (
              <div className="mt-3 text-xs text-green-600 bg-green-50 p-2 rounded">
                Message envoyé le {new Date(lead.linkedin_message_sent_at!).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE - Actions */}
        <div className="w-1/3 bg-gray-50 p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            
            {/* Envoyer message LinkedIn */}
            <Button
              onClick={onSendLinkedInMessage}
              disabled={messageSending || isMessageTooLong || !customMessage.trim() || hasLinkedInMessage}
              className="w-full mb-4 h-12"
            >
              <Send className="h-4 w-4 mr-2" />
              {messageSending ? 'Envoi en cours...' : 
               hasLinkedInMessage ? 'Message déjà envoyé' : 
               'Envoyer le message LinkedIn'}
            </Button>
          </div>

          <div className="space-y-4">
            {/* Récupérer téléphone */}
            {!lead.phone_number ? (
              <Button
                onClick={handleRetrievePhone}
                disabled={phoneLoading}
                variant="outline"
                className="w-full"
              >
                <Phone className="h-4 w-4 mr-2" />
                {phoneLoading ? 'Recherche...' : 'Récupérer le téléphone'}
              </Button>
            ) : (
              <div className="bg-white p-4 rounded border">
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
              className="w-full"
              onClick={() => onAction('schedule_reminder')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Planifier un rappel
            </Button>
          </div>

          {/* Section Signalement */}
          <div className="mt-8 pt-6 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Signalement</h4>
            
            <div className="space-y-2">
              <Button
                onClick={handleMistargetedPost}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                <AlertTriangle className="h-3 w-3 mr-2" />
                Publication mal ciblée
              </Button>
              
              <Button
                onClick={() => onAction('hr_provider')}
                variant="outline"
                size="sm"
                className="w-full text-xs"
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
