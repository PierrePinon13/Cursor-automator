
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Linkedin, Phone, Calendar, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

const LeadDetailDialog = ({ lead, isOpen, onClose }: LeadDetailDialogProps) => {
  if (!lead) return null;

  // Mock data pour le message pré-rédigé
  const mockMessage = `Bonjour ${lead.author_name?.split(' ')[0] || 'Cher(e) professionnel(le)'},

J'ai remarqué votre récente publication concernant la recherche de ${lead.openai_step3_postes_selectionnes?.[0] || 'profils qualifiés'}. 

En tant que spécialiste du recrutement dans le secteur ${lead.openai_step3_categorie}, je dispose d'un réseau de candidats expérimentés qui pourraient parfaitement correspondre à vos besoins.

Seriez-vous disponible pour un échange téléphonique de 15 minutes cette semaine pour discuter de vos enjeux de recrutement ?

Bien cordialement,
[Votre nom]`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Détails du Lead</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[calc(90vh-120px)]">
          {/* Section gauche - Synthèse du lead */}
          <div className="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
            <div className="space-y-4">
              {/* Prénom nom + logo LinkedIn */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{lead.author_name || 'N/A'}</h3>
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

              {/* Poste et entreprise actuels */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-600">Poste et entreprise actuels</h4>
                {lead.unipile_company ? (
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="font-medium text-sm">{lead.unipile_company}</div>
                    {lead.unipile_position && (
                      <div className="text-sm text-gray-600 mt-1">{lead.unipile_position}</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-500">Données non disponibles</div>
                    <div className="text-xs text-gray-400 mt-1">{lead.author_headline || 'N/A'}</div>
                  </div>
                )}
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

              {/* Publication LinkedIn */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-600">Publication LinkedIn</h4>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-sm text-gray-700 line-clamp-4 mb-2">
                    {lead.text}
                  </div>
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
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
              <h4 className="font-medium text-gray-800">Message pré-rédigé</h4>
              <div className="bg-blue-50 p-4 rounded-lg border">
                <textarea
                  className="w-full h-80 bg-transparent border-none resize-none text-sm focus:outline-none"
                  value={mockMessage}
                  readOnly
                />
              </div>
              <div className="text-xs text-gray-500">
                Ce message a été généré automatiquement par IA. Vous pouvez le modifier avant envoi.
              </div>
            </div>
          </div>

          {/* Section droite - Boutons d'actions */}
          <div className="w-1/3 p-6 overflow-y-auto">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">Actions</h4>
              
              <div className="space-y-3">
                <Button className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-700">
                  <Linkedin className="h-4 w-4" />
                  Envoyer message LinkedIn
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Phone className="h-4 w-4" />
                  Récupérer Téléphone
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Calendar className="h-4 w-4" />
                  Planifier un Rappel
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Users className="h-4 w-4" />
                  Prestataire RH
                </Button>
                
                <Button variant="destructive" className="w-full justify-start gap-3">
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
