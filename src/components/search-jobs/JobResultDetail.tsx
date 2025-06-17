
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Building, MapPin, Calendar, User, MessageSquare, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessagePreviewModal } from './MessagePreviewModal';

interface JobResultDetailProps {
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    postedDate: Date;
    description: string;
    messageTemplate?: string;
    personas: Array<{
      id: string;
      name: string;
      title: string;
      profileUrl: string;
    }>;
  };
  onClose: () => void;
}

export const JobResultDetail = ({ job, onClose }: JobResultDetailProps) => {
  const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(new Set());
  const [showMessageModal, setShowMessageModal] = useState(false);

  const togglePersona = (personaId: string) => {
    setSelectedPersonas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personaId)) {
        newSet.delete(personaId);
      } else {
        newSet.add(personaId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPersonas(new Set(job.personas.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedPersonas(new Set());
  };

  const handleSendMessages = () => {
    setShowMessageModal(true);
  };

  const selectedPersonasList = job.personas.filter(p => selectedPersonas.has(p.id));

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {job.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informations sur l'offre */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="font-medium">{job.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDistanceToNow(job.postedDate, { addSuffix: true, locale: fr })}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                {job.messageTemplate && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Template de message configuré
                      </h4>
                      <div className="bg-gray-50 p-3 rounded text-sm border">
                        {job.messageTemplate}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sélection des personas */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Contacts trouvés ({job.personas.length})
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Tout sélectionner
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Tout désélectionner
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {job.personas.map((persona) => (
                  <Card key={persona.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedPersonas.has(persona.id)}
                          onCheckedChange={() => togglePersona(persona.id)}
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{persona.name}</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{persona.title}</p>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-xs"
                          >
                            <a
                              href={persona.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Voir le profil
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedPersonas.size} contact(s) sélectionné(s)
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
                
                <Button
                  onClick={handleSendMessages}
                  disabled={selectedPersonas.size === 0}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Envoyer des messages ({selectedPersonas.size})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de prévisualisation et envoi des messages */}
      {showMessageModal && (
        <MessagePreviewModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          personas={selectedPersonasList}
          jobTitle={job.title}
          companyName={job.company}
          initialTemplate={job.messageTemplate}
        />
      )}
    </>
  );
};
