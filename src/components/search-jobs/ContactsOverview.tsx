
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Users, Eye, EyeOff, Building } from 'lucide-react';
import { PersonaCard } from './PersonaCard';
import { MessagePreviewModal } from './MessagePreviewModal';
import { supabase } from '@/integrations/supabase/client';

interface Persona {
  id: string;
  name: string;
  title: string;
  profileUrl: string;
  company?: string;
  linkedin_id?: string;
  jobTitle?: string;
  jobCompany?: string;
}

interface ContactsOverviewProps {
  searchResults: any[];
  searchName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ContactsOverview = ({ searchResults, searchName, isOpen, onClose }: ContactsOverviewProps) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [hiddenContacts, setHiddenContacts] = useState<string[]>([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [lastContactChecks, setLastContactChecks] = useState<Record<string, any>>({});
  const [showHidden, setShowHidden] = useState(false);

  // Collecter tous les contacts de tous les jobs
  const allContacts: Persona[] = searchResults.flatMap(job => 
    job.personas?.map((persona: any) => ({
      ...persona,
      jobTitle: job.title,
      jobCompany: job.company
    })) || []
  );

  // Dédupliquer les contacts par profileUrl
  const uniqueContacts = allContacts.reduce((acc, contact) => {
    const existing = acc.find(c => c.profileUrl === contact.profileUrl);
    if (!existing) {
      acc.push(contact);
    }
    return acc;
  }, [] as Persona[]);

  // Vérifier les derniers contacts
  const checkLastContacts = async () => {
    const checks: Record<string, any> = {};
    
    for (const contact of uniqueContacts) {
      try {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, last_contact_at, contacted_by_user_name')
          .eq('author_profile_url', contact.profileUrl)
          .eq('lead_source', 'job_search')
          .maybeSingle();

        if (existingLead?.last_contact_at) {
          const lastContactDate = new Date(existingLead.last_contact_at);
          const now = new Date();
          const hoursAgo = (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60);
          const daysAgo = hoursAgo / 24;

          if (daysAgo <= 7) {
            checks[contact.id] = {
              lastContactAt: existingLead.last_contact_at,
              contactedBy: existingLead.contacted_by_user_name || 'Utilisateur inconnu',
              hoursAgo: Math.round(hoursAgo * 10) / 10,
              daysAgo: Math.round(daysAgo * 10) / 10
            };
          }
        }
      } catch (error) {
        console.error('Error checking last contact for:', contact.name, error);
      }
    }
    
    setLastContactChecks(checks);
  };

  useEffect(() => {
    if (isOpen && uniqueContacts.length > 0) {
      checkLastContacts();
    }
  }, [isOpen, uniqueContacts.length]);

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleHideContact = (contactId: string) => {
    setHiddenContacts(prev => [...prev, contactId]);
    setSelectedContacts(prev => prev.filter(id => id !== contactId));
  };

  const handleSelectAll = () => {
    const visibleContacts = uniqueContacts.filter(c => showHidden || !hiddenContacts.includes(c.id));
    setSelectedContacts(visibleContacts.map(c => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedContacts([]);
  };

  const openMessageModal = () => {
    if (selectedContacts.length === 0) {
      const visibleContacts = uniqueContacts.filter(c => showHidden || !hiddenContacts.includes(c.id));
      setSelectedContacts(visibleContacts.map(c => c.id));
    }
    setIsMessageModalOpen(true);
  };

  const visibleContacts = uniqueContacts.filter(c => showHidden || !hiddenContacts.includes(c.id));
  const selectedContactObjects = uniqueContacts.filter(c => 
    selectedContacts.includes(c.id) && (showHidden || !hiddenContacts.includes(c.id))
  );

  const selectedCount = selectedContactObjects.length;
  const visibleCount = visibleContacts.length;
  const recentContactCount = visibleContacts.filter(c => lastContactChecks[c.id]).length;

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-4 z-50 overflow-auto">
        <Card className="w-full max-w-7xl mx-auto">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tous les contacts - {searchName}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    <span>{searchResults.length} offre{searchResults.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{uniqueContacts.length} contact{uniqueContacts.length > 1 ? 's' : ''} unique{uniqueContacts.length > 1 ? 's' : ''}</span>
                  </div>
                  {recentContactCount > 0 && (
                    <Badge variant="outline" className="text-orange-600">
                      {recentContactCount} contact{recentContactCount > 1 ? 's' : ''} récent{recentContactCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
              
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Actions de sélection */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedCount === visibleCount && visibleCount > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleSelectAll();
                      } else {
                        handleDeselectAll();
                      }
                    }}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Tout sélectionner ({visibleCount})
                  </label>
                </div>
                
                {selectedCount > 0 && (
                  <Badge variant="default" className="bg-blue-600">
                    {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                  </Badge>
                )}

                {hiddenContacts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHidden(!showHidden)}
                    className="flex items-center gap-2"
                  >
                    {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showHidden ? 'Masquer' : 'Afficher'} les contacts masqués ({hiddenContacts.length})
                  </Button>
                )}
              </div>

              <Button
                onClick={openMessageModal}
                disabled={selectedCount === 0}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Contacter {selectedCount > 0 ? `(${selectedCount})` : 'sélectionnés'}
              </Button>
            </div>

            {/* Grille des contacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleContacts.map((contact) => (
                <div key={contact.id} className="relative">
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleToggleContact(contact.id)}
                      className="bg-white border-2 shadow-sm"
                    />
                  </div>
                  <PersonaCard
                    persona={contact}
                    isSelected={selectedContacts.includes(contact.id)}
                    onToggleSelect={handleToggleContact}
                    onHide={handleHideContact}
                    lastContactInfo={lastContactChecks[contact.id]}
                    showJobInfo={true}
                  />
                </div>
              ))}
            </div>

            {visibleCount === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Aucun contact visible</p>
                {hiddenContacts.length > 0 ? (
                  <p>Tous les contacts ont été masqués. 
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHidden(true)}
                      className="ml-2"
                    >
                      Afficher les contacts masqués
                    </Button>
                  </p>
                ) : (
                  <p>Aucun contact trouvé pour cette recherche.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MessagePreviewModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        personas={selectedContactObjects}
        jobTitle="Recherche groupée"
        companyName={searchName}
        initialTemplate=""
      />
    </>
  );
};
