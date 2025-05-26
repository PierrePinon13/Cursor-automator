import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Linkedin, Phone, Calendar, Users, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';

interface Lead {
  id: string;
  created_at: string;
  author_name: string;
  author_headline: string;
  author_profile_url: string;
  text: string;
  title: string;
  url: string;
  posted_at_iso: string;
  posted_at_timestamp: number;
  openai_step2_localisation: string;
  openai_step3_categorie: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_justification: string;
  unipile_company: string;
  unipile_position: string;
  unipile_profile_scraped: boolean;
  unipile_profile_scraped_at: string;
}

interface LeadDetailDialogProps {
  leads: Lead[];
  selectedLeadIndex: number | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLead: (index: number) => void;
  onActionCompleted: () => void;
}

const LeadDetailDialog = ({ 
  leads, 
  selectedLeadIndex, 
  isOpen, 
  onClose, 
  onNavigateToLead, 
  onActionCompleted 
}: LeadDetailDialogProps) => {
  const [customMessage, setCustomMessage] = useState('');
  const { sendMessage, loading: messageSending } = useLinkedInMessage();

  if (selectedLeadIndex === null || !leads[selectedLeadIndex]) return null;

  const lead = leads[selectedLeadIndex];
  const canGoPrevious = selectedLeadIndex > 0;
  const canGoNext = selectedLeadIndex < leads.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onNavigateToLead(selectedLeadIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigateToLead(selectedLeadIndex + 1);
    }
  };

  const handleAction = (actionName: string) => {
    console.log(`Action ${actionName} executée pour le lead ${lead.author_name}`);
    // Ici on pourrait ajouter la logique spécifique à chaque action
    onActionCompleted();
  };

  // Mock data pour le message pré-rédigé
  const defaultMessage = `Bonjour ${lead.author_name?.split(' ')[0] || 'Cher(e) professionnel(le)'},

J'ai remarqué votre récente publication concernant la recherche de ${lead.openai_step3_postes_selectionnes?.[0] || 'profils qualifiés'}. 

En tant que spécialiste du recrutement dans le secteur ${lead.openai_step3_categorie}, je dispose d'un réseau de candidats expérimentés qui pourraient parfaitement correspondre à vos besoins.

Seriez-vous disponible pour un échange téléphonique de 15 minutes cette semaine pour discuter de vos enjeux de recrutement ?

Bien cordialement,
[Votre nom]`;

  // Initialize message with default if empty
  React.useEffect(() => {
    if (!customMessage) {
      setCustomMessage(defaultMessage);
    }
  }, [defaultMessage]);

  const handleSendLinkedInMessage = async () => {
    // Extract profile ID from URL if available
    let profileId = '';
    if (lead.author_profile_url) {
      // Extract from LinkedIn URL pattern: https://linkedin.com/in/profile-id
      const match = lead.author_profile_url.match(/\/in\/([^\/]+)/);
      if (match) {
        profileId = match[1];
      }
    }

    if (!profileId) {
      console.error('Could not determine profile ID for lead');
      return;
    }

    const messageToSend = customMessage.trim() || defaultMessage;
    
    const success = await sendMessage(profileId, messageToSend);
    if (success) {
      onActionCompleted();
      setCustomMessage('');
    }
  };

  const formatCompanyInfo = () => {
    if (lead.unipile_company && lead.unipile_position) {
      return `${lead.unipile_position} @ ${lead.unipile_company}`;
    } else if (lead.unipile_company) {
      return `@ ${lead.unipile_company}`;
    } else if (lead.unipile_position) {
      return lead.unipile_position;
    } else if (lead.author_headline) {
      return lead.author_headline;
    }
    return 'Informations non disponibles';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Détails du Lead ({selectedLeadIndex + 1}/{leads.length})
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canGoNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex h-[calc(90vh-120px)]">
          {/* Section gauche - Synthèse du lead */}
          <div className="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
            <div className="space-y-6">
              {/* Prénom nom + logo LinkedIn + infos entreprise */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{lead.author_name || 'N/A'}</h3>
                    <div className="text-sm text-gray-600">
                      {formatCompanyInfo()}
                    </div>
                  </div>
                  <a
                    href={lead.author_profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Linkedin className="h-6 w-6" />
                  </a>
                </div>
              </div>

              {/* Poste recherché */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-600">Poste recherché</h4>
                <div className="space-y-1">
                  {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                    <Badge key={index} className="bg-green-100 text-green-800 border-green-300">
                      {poste}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Publication LinkedIn - plus d'espace */}
              <div className="space-y-2 flex-1">
                <h4 className="font-medium text-sm text-gray-600">Publication LinkedIn</h4>
                <div className="bg-white p-4 rounded-lg border" style={{ height: '400px' }}>
                  <ScrollArea className="h-full">
                    <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                      {lead.text}
                    </div>
                  </ScrollArea>
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mt-2"
                  >
                    Voir la publication
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Section milieu - Message pré-rédigé */}
          <div className="w-1/3 p-6 border-r overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-800">Message LinkedIn</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomMessage(defaultMessage)}
                >
                  Réinitialiser
                </Button>
              </div>
              <div className="space-y-2">
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Rédigez votre message LinkedIn..."
                  className="min-h-[380px] resize-none text-sm"
                />
                <div className="text-xs text-gray-500">
                  Ce message sera envoyé via LinkedIn. Vous pouvez le personnaliser avant l'envoi.
                </div>
              </div>
            </div>
          </div>

          {/* Section droite - Boutons d'actions */}
          <div className="w-1/3 p-6 overflow-y-auto">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">Actions</h4>
              
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSendLinkedInMessage}
                  disabled={messageSending || !customMessage.trim()}
                >
                  <Linkedin className="h-4 w-4" />
                  {messageSending ? 'Envoi en cours...' : 'Envoyer message LinkedIn'}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => handleAction('Récupérer Téléphone')}
                >
                  <Phone className="h-4 w-4" />
                  Récupérer Téléphone
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => handleAction('Planifier un Rappel')}
                >
                  <Calendar className="h-4 w-4" />
                  Planifier un Rappel
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => handleAction('Prestataire RH')}
                >
                  <Users className="h-4 w-4" />
                  Prestataire RH
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-3"
                  onClick={() => handleAction('Bad Job')}
                >
                  <X className="h-4 w-4" />
                  Bad Job
                </Button>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Catégorie: {lead.openai_step3_categorie}</div>
                  <div>Localisation: {lead.openai_step2_localisation || 'France'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailDialog;
