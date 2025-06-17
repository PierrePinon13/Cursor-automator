
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, MapPin, Calendar, Building, ExternalLink } from 'lucide-react';
import { MessagePreviewModal } from './MessagePreviewModal';
import { PersonaCard } from './PersonaCard';
import { JobResult } from '@/hooks/useSearchJobs/useCurrentJobResults';
import { supabase } from '@/integrations/supabase/client';

interface JobResultDetailProps {
  job: JobResult;
}

export const JobResultDetail = ({ job }: JobResultDetailProps) => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [hiddenPersonas, setHiddenPersonas] = useState<string[]>([]);
  const [lastContactChecks, setLastContactChecks] = useState<Record<string, any>>({});

  // Vérifier les derniers contacts pour tous les personas
  const checkLastContacts = async () => {
    const checks: Record<string, any> = {};
    
    for (const persona of job.personas) {
      try {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, last_contact_at, contacted_by_user_name')
          .eq('author_profile_url', persona.profileUrl)
          .eq('lead_source', 'job_search')
          .maybeSingle();

        if (existingLead?.last_contact_at) {
          const lastContactDate = new Date(existingLead.last_contact_at);
          const now = new Date();
          const hoursAgo = (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60);
          const daysAgo = hoursAgo / 24;

          if (daysAgo <= 7) {
            checks[persona.id] = {
              lastContactAt: existingLead.last_contact_at,
              contactedBy: existingLead.contacted_by_user_name || 'Utilisateur inconnu',
              hoursAgo: Math.round(hoursAgo * 10) / 10,
              daysAgo: Math.round(daysAgo * 10) / 10
            };
          }
        }
      } catch (error) {
        console.error('Error checking last contact for:', persona.name, error);
      }
    }
    
    setLastContactChecks(checks);
  };

  useEffect(() => {
    if (job.personas.length > 0) {
      checkLastContacts();
    }
  }, [job.personas]);

  const handleTogglePersona = (personaId: string) => {
    setSelectedPersonas(prev => 
      prev.includes(personaId) 
        ? prev.filter(id => id !== personaId)
        : [...prev, personaId]
    );
  };

  const handleHidePersona = (personaId: string) => {
    setHiddenPersonas(prev => [...prev, personaId]);
    setSelectedPersonas(prev => prev.filter(id => id !== personaId));
  };

  const handleSelectAll = () => {
    const visiblePersonas = job.personas.filter(p => !hiddenPersonas.includes(p.id));
    setSelectedPersonas(visiblePersonas.map(p => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPersonas([]);
  };

  const openMessageModal = () => {
    if (selectedPersonas.length === 0) {
      // Sélectionner automatiquement tous les personas visibles
      const visiblePersonas = job.personas.filter(p => !hiddenPersonas.includes(p.id));
      setSelectedPersonas(visiblePersonas.map(p => p.id));
    }
    setIsMessageModalOpen(true);
  };

  const selectedPersonaObjects = job.personas.filter(p => 
    selectedPersonas.includes(p.id) && !hiddenPersonas.includes(p.id)
  );

  const visiblePersonas = job.personas.filter(p => !hiddenPersonas.includes(p.id));
  const visiblePersonasCount = visiblePersonas.length;
  const selectedCount = selectedPersonas.filter(id => !hiddenPersonas.includes(id)).length;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl text-gray-900">{job.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>{job.company}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(job.postedDate)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {visiblePersonasCount} contact{visiblePersonasCount > 1 ? 's' : ''}
                {hiddenPersonas.length > 0 && (
                  <span className="text-gray-500">
                    ({hiddenPersonas.length} masqué{hiddenPersonas.length > 1 ? 's' : ''})
                  </span>
                )}
              </Badge>
              
              {job.jobUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={job.jobUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description du poste */}
          {job.description && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <p className="text-sm text-gray-700 line-clamp-3">{job.description}</p>
            </div>
          )}

          {/* Section des contacts */}
          {visiblePersonasCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">
                  Contacts ({visiblePersonasCount})
                </h4>
                
                <div className="flex items-center gap-2">
                  {selectedCount > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                    </span>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectedCount === visiblePersonasCount ? handleDeselectAll : handleSelectAll}
                  >
                    {selectedCount === visiblePersonasCount ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Button>
                  
                  <Button
                    onClick={openMessageModal}
                    disabled={visiblePersonasCount === 0}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contacter {selectedCount > 0 ? `(${selectedCount})` : 'tous'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visiblePersonas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    isSelected={selectedPersonas.includes(persona.id)}
                    onToggleSelect={handleTogglePersona}
                    onHide={handleHidePersona}
                    lastContactInfo={lastContactChecks[persona.id]}
                  />
                ))}
              </div>

              {hiddenPersonas.length > 0 && (
                <div className="mt-3 text-sm text-gray-500 text-center">
                  {hiddenPersonas.length} contact{hiddenPersonas.length > 1 ? 's' : ''} masqué{hiddenPersonas.length > 1 ? 's' : ''}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHiddenPersonas([]);
                      checkLastContacts(); // Recharger les infos de contact
                    }}
                    className="ml-2 h-6 text-xs"
                  >
                    Tout afficher
                  </Button>
                </div>
              )}
            </div>
          )}

          {visiblePersonasCount === 0 && hiddenPersonas.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Tous les contacts ont été masqués</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHiddenPersonas([]);
                  checkLastContacts();
                }}
                className="mt-2"
              >
                Tout afficher
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MessagePreviewModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        personas={selectedPersonaObjects}
        jobTitle={job.title}
        companyName={job.company}
        initialTemplate={job.messageTemplate || ''}
      />
    </>
  );
};
