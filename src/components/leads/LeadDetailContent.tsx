
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, User, ExternalLink, Building, Phone, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import LeadActionsSection from './LeadActionsSection';
import LeadMessageSection from './LeadMessageSection';
import PhoneContactStatus from './PhoneContactStatus';
import { LeadWorkHistory } from './LeadWorkHistory';

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
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert pour entreprise cliente précédente */}
      {lead.has_previous_client_company && (
        <Card className="border-blue-500 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Crown className="h-5 w-5" />
              <span className="font-medium">Entreprise cliente précédente détectée !</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Cette personne a travaillé dans : {lead.previous_client_companies?.join(', ')}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              💡 Utilisez cette information comme réassurance lors de votre prise de contact
            </p>
          </CardContent>
        </Card>
      )}

      {/* Informations principales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations du lead
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Nom :</span>
              <p className="text-sm">{lead.author_name || 'Non disponible'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Entreprise :</span>
              <p className="text-sm">{lead.unipile_company || lead.company_name || 'Non disponible'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Poste :</span>
              <p className="text-sm">{lead.unipile_position || lead.company_position || 'Non disponible'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Localisation :</span>
              <p className="text-sm">{lead.openai_step2_localisation || 'Non disponible'}</p>
            </div>
          </div>

          {lead.openai_step3_categorie && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Catégorie :</span>
              <Badge variant="outline" className="ml-2">
                {lead.openai_step3_categorie}
              </Badge>
            </div>
          )}

          {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Postes recherchés :</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {lead.openai_step3_postes_selectionnes.map((poste: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {poste}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {lead.phone_number && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Téléphone :</span>
              <p className="text-sm">{lead.phone_number}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Date de publication :</span>
            <p className="text-sm">{formatDate(lead.posted_at_iso)}</p>
          </div>

          {lead.author_profile_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={lead.author_profile_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir le profil LinkedIn
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Historique professionnel */}
      <LeadWorkHistory lead={lead} />

      {/* Publication LinkedIn */}
      <Card>
        <CardHeader>
          <CardTitle>Publication LinkedIn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lead.title && (
            <div>
              <h4 className="font-medium mb-2">{lead.title}</h4>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{lead.text}</p>
          </div>
          
          {lead.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={lead.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir la publication
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Statut contact téléphonique */}
      {lead.phone_number && (
        <PhoneContactStatus
          leadId={lead.id}
          phoneNumber={lead.phone_number}
          currentStatus={lead.phone_contact_status}
          onStatusUpdate={() => onContactUpdate?.()}
        />
      )}

      <Separator />

      {/* Actions */}
      <LeadActionsSection 
        lead={lead} 
        onAction={onAction}
        onSendLinkedInMessage={onSendLinkedInMessage}
        messageSending={messageSending}
        customMessage={customMessage}
        onPhoneRetrieved={onPhoneRetrieved}
        onContactUpdate={onContactUpdate}
      />

      <Separator />

      {/* Message LinkedIn */}
      <LeadMessageSection 
        lead={lead} 
        customMessage={customMessage}
        onMessageChange={onMessageChange} 
      />
    </div>
  );
};

export default LeadDetailContent;
