import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Search, Filter, Users, AlertTriangle, Building, Briefcase, CheckCircle, X, MapPin } from 'lucide-react';
import { usePersonaSelections } from '@/hooks/usePersonaSelections';
import { useToast } from '@/hooks/use-toast';
import { ProspectingStepProfileV2, Lead } from './ProspectingStepProfileV2';
import { LeadCard } from '@/components/leads/LeadCard';
import { useIsMobile } from '@/hooks/use-mobile';
import CompanyHoverCard from '@/components/leads/CompanyHoverCard';
import { Linkedin } from 'lucide-react';

// === NOUVEAU COMPOSANT POUR LA PROSPECTION VOLUMIQUE ===
// Copie de la grille d'affichage des profils uniques
import { BulkProspectingLeadCard } from './BulkProspectingLeadCard';

interface JobData {
  id: string;
  title: string;
  company: string;
  personas: any[];
}

interface ProspectingStepProfileProps {
  jobData: JobData;
  selectedPersonas: any[];
  onSelectionChange: (personas: any[]) => void;
  removedPersonaIds: string[];
  setRemovedPersonaIds: (ids: string[] | ((ids: string[]) => string[])) => void;
  setUntreatedCount: (count: number) => void;
}

export const ProspectingStepProfile = ({ 
  jobData, 
  selectedPersonas, 
  onSelectionChange,
  removedPersonaIds,
  setRemovedPersonaIds,
  setUntreatedCount
}: ProspectingStepProfileProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [validatedPersonaIds, setValidatedPersonaIds] = useState<string[]>([]);
  const [duplicateSelections, setDuplicateSelections] = useState<{ [personaKey: string]: string }>({});
  const [processingDuplicates, setProcessingDuplicates] = useState<{ [personaKey: string]: boolean }>({});
  const [validatedDuplicates, setValidatedDuplicates] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const searchId = `bulk-${Date.now()}`;
  const { updatePersonaStatus, isPersonaRemoved, isDuplicateValidated, getSelectedJobId } = usePersonaSelections(searchId);

  // Grouper les personas par identité unique et séparer ceux avec plusieurs offres
  const { uniquePersonas, duplicatePersonas, duplicatesRemoved } = useMemo(() => {
    if (!jobData?.personas || !Array.isArray(jobData.personas)) {
      return {
        uniquePersonas: [],
        duplicatePersonas: [],
        duplicatesRemoved: 0
      };
    }

    const personaMap = new Map<string, any[]>();
    
    // Grouper par identité (nom + titre ou ID LinkedIn) en excluant les personas supprimés ET validés
    jobData.personas.forEach(persona => {
      if (!persona || typeof persona !== 'object') return;
      if (isPersonaRemoved(persona.id)) return; // Ignorer les personas supprimés
      if (isDuplicateValidated(persona.id)) return; // Ignorer les personas déjà validés
      
      const key = persona.id || persona.linkedinId || `${persona.name || 'unknown'}-${persona.title || 'unknown'}`;
      if (!personaMap.has(key)) {
        personaMap.set(key, []);
      }
      personaMap.get(key)!.push(persona);
    });

    const unique: any[] = [];
    const duplicates: any[] = [];
    let removedCount = 0;
    
    personaMap.forEach((personas, key) => {
      if (personas.length === 1) {
        // Persona unique
        const persona = personas[0];
        if (persona && typeof persona === 'object') {
          persona._jobOffers = [{
            jobId: persona.jobId || jobData.id,
            jobTitle: persona.jobTitle || jobData.title,
            jobCompany: persona.jobCompany || jobData.company,
            jobLocation: persona.location
          }];
          unique.push(persona);
        }
      } else {
        // Persona avec plusieurs offres - vérifier s'il n'a pas déjà été traité
        if (!validatedDuplicates.has(key)) {
          removedCount += personas.length - 1;
          const representative = personas[0];
          if (representative && typeof representative === 'object') {
            representative._jobOffers = personas
              .filter(p => p && typeof p === 'object')
              .map(p => ({
                jobId: p.jobId || jobData.id,
                jobTitle: p.jobTitle || jobData.title,
                jobCompany: p.jobCompany || jobData.company,
                jobLocation: p.jobLocation || p.location || '',
                jobUrl: p.jobUrl || ''
              }));
            representative._isMultipleOffers = true;
            representative._personaKey = key;
            duplicates.push(representative);
          }
        }
      }
    });

    return {
      uniquePersonas: unique,
      duplicatePersonas: duplicates,
      duplicatesRemoved: removedCount
    };
  }, [jobData, isPersonaRemoved, isDuplicateValidated, validatedDuplicates]);

  const filteredUniquePersonas = uniquePersonas.filter(persona => {
    if (!persona || typeof persona !== 'object') return false;
    
    const matchesSearch = !searchTerm || 
      (persona.name && persona.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (persona.title && persona.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (persona.company && persona.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (persona._jobOffers && Array.isArray(persona._jobOffers) && persona._jobOffers.some((offer: any) => 
        (offer.jobTitle && offer.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (offer.jobCompany && offer.jobCompany.toLowerCase().includes(searchTerm.toLowerCase()))
      ));
    
    const matchesFilter = !showOnlySelected || 
      selectedPersonas.some(selected => selected && selected.id === persona.id);
    
    return matchesSearch && matchesFilter;
  });

  const filteredDuplicatePersonas = duplicatePersonas.filter(persona => {
    if (!persona || typeof persona !== 'object') return false;
    
    const matchesSearch = !searchTerm || 
      (persona.name && persona.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (persona.title && persona.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (persona.company && persona.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const togglePersona = (persona: any) => {
    if (!persona || typeof persona !== 'object') return;
    
    const isSelected = selectedPersonas.some(selected => selected && selected.id === persona.id);
    
    if (isSelected) {
      // Supprimer de la sélection
      const updatedSelection = selectedPersonas.filter(selected => selected && selected.id !== persona.id);
      onSelectionChange(updatedSelection);
      updatePersonaStatus(persona.id, persona.jobId || jobData.id, 'removed');
    } else {
      // Ajouter à la sélection
      const jobOffer = persona._jobOffers && persona._jobOffers[0] ? persona._jobOffers[0] : {
        jobId: jobData.id,
        jobTitle: jobData.title,
        jobCompany: jobData.company,
        jobLocation: persona.location
      };
      
      const personaWithJob = {
        ...persona,
        jobId: jobOffer.jobId,
        jobTitle: jobOffer.jobTitle,
        jobCompany: jobOffer.jobCompany,
        location: jobOffer.jobLocation
      };
      onSelectionChange([...selectedPersonas, personaWithJob]);
      updatePersonaStatus(persona.id, persona.jobId || jobData.id, 'selected');
    }
  };

  const handleDuplicateOfferSelection = (personaKey: string, jobOfferId: string) => {
    setDuplicateSelections(prev => ({
      ...prev,
      [personaKey]: jobOfferId
    }));
  };

  const handleDuplicateValidation = async (persona: any) => {
    const personaKey = persona._personaKey;
    const selectedOfferId = duplicateSelections[personaKey];
    
    if (!selectedOfferId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une offre avant de valider.",
        variant: "destructive",
      });
      return;
    }
    
    setProcessingDuplicates(prev => ({ ...prev, [personaKey]: true }));
    
    try {
      const selectedOffer = persona._jobOffers.find((offer: any) => offer.jobId === selectedOfferId);
      if (!selectedOffer) {
        throw new Error("Offre sélectionnée introuvable");
      }

      // Créer le persona spécifique avec les détails de l'offre sélectionnée
      const specificPersona = {
        ...persona,
        jobId: selectedOffer.jobId,
        jobTitle: selectedOffer.jobTitle,
        jobCompany: selectedOffer.jobCompany,
        location: selectedOffer.jobLocation,
        jobLocation: selectedOffer.jobLocation,
        jobUrl: selectedOffer.jobUrl,
        _selectedForOffer: selectedOffer.jobId
      };

      // Mettre à jour en base de données pour marquer comme validé
      await updatePersonaStatus(persona.id, selectedOfferId, 'duplicate_validated', selectedOfferId);

      // Ajouter à la sélection des personas
      const updatedSelection = [...selectedPersonas.filter(p => p.id !== persona.id), specificPersona];
      onSelectionChange(updatedSelection);
      
      // Marquer ce doublon comme validé pour le faire disparaître de l'interface
      setValidatedDuplicates(prev => new Set([...prev, personaKey]));
      
      // Nettoyer les sélections temporaires
      setDuplicateSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[personaKey];
        return newSelections;
      });

      toast({
        title: "Doublon traité",
        description: `${persona.name} a été ajouté avec l'offre sélectionnée.`,
      });

      console.log('Doublon validé avec succès:', {
        personaId: persona.id,
        selectedOfferId,
        personaName: persona.name
      });

    } catch (error) {
      console.error('Erreur lors de la validation du doublon:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du traitement du doublon.",
        variant: "destructive",
      });
    } finally {
      setProcessingDuplicates(prev => ({ ...prev, [personaKey]: false }));
    }
  };

  const handleDuplicateSkip = async (persona: any) => {
    const personaKey = persona._personaKey;
    
    setProcessingDuplicates(prev => ({ ...prev, [personaKey]: true }));
    
    try {
      // Marquer comme validé en base de données (ignoré)
      await updatePersonaStatus(persona.id, '', 'duplicate_validated');
      
      // Marquer ce doublon comme validé pour le faire disparaître de l'interface
      setValidatedDuplicates(prev => new Set([...prev, personaKey]));
      
      // Nettoyer la sélection
      setDuplicateSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[personaKey];
        return newSelections;
      });

      toast({
        title: "Doublon ignoré",
        description: `${persona.name} a été ignoré et ne sera pas inclus dans la prospection.`,
      });

      console.log('Doublon ignoré:', {
        personaId: persona.id,
        personaName: persona.name
      });

    } catch (error) {
      console.error('Erreur lors de l\'ignorement du doublon:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ignorement du doublon.",
        variant: "destructive",
      });
    } finally {
      setProcessingDuplicates(prev => ({ ...prev, [personaKey]: false }));
    }
  };

  const handleRemovePersona = async (personaId: string) => {
    try {
      // Mettre à jour en base de données
      await updatePersonaStatus(personaId, '', 'removed');
      
      // Supprimer de la sélection s'il y était
      const updatedSelection = selectedPersonas.filter(selected => selected && selected.id !== personaId);
      onSelectionChange(updatedSelection);

      console.log('Persona supprimé:', personaId);

    } catch (error) {
      console.error('Erreur lors de la suppression du persona:', error);
    }
  };

  const selectAll = () => {
    const allPersonasWithJobs = filteredUniquePersonas
      .filter(persona => !isPersonaRemoved(persona.id)) // Exclure les personas supprimés
      .map(persona => {
        const jobOffer = persona._jobOffers && persona._jobOffers[0] ? persona._jobOffers[0] : {
          jobId: jobData.id,
          jobTitle: jobData.title,
          jobCompany: jobData.company,
          jobLocation: persona.location
        };
        
        return {
          ...persona,
          jobId: jobOffer.jobId,
          jobTitle: jobOffer.jobTitle,
          jobCompany: jobOffer.jobCompany,
          location: jobOffer.jobLocation
        };
      });
    
    // Mettre à jour en base de données
    allPersonasWithJobs.forEach(persona => {
      updatePersonaStatus(persona.id, persona.jobId, 'selected');
    });
    
    onSelectionChange(allPersonasWithJobs);
  };

  const deselectAll = () => {
    // Mettre à jour en base de données
    selectedPersonas.forEach(persona => {
      updatePersonaStatus(persona.id, persona.jobId || jobData.id, 'removed');
    });
    
    onSelectionChange([]);
  };

  const handleShowOnlySelectedChange = (checked: boolean | "indeterminate") => {
    setShowOnlySelected(checked === true);
  };

  // Liste des profils à traiter (ni validés ni rejetés)
  const untreatedPersonas = uniquePersonas.filter(
    p => !validatedPersonaIds.includes(p.id) && !removedPersonaIds.includes(p.id)
  );

  // Liste des profils à afficher : validés + non traités (sans doublons)
  const validatedPersonas = uniquePersonas.filter(p => validatedPersonaIds.includes(p.id));
  const untreatedPersonasFiltered = uniquePersonas.filter(p => !validatedPersonaIds.includes(p.id) && !removedPersonaIds.includes(p.id));
  const displayedPersonas = [...validatedPersonas, ...untreatedPersonasFiltered];

  // Mettre à jour le nombre de profils non traités à chaque render
  useEffect(() => {
    setUntreatedCount(untreatedPersonas.length);
  }, [untreatedPersonas.length, setUntreatedCount]);

  // Callback pour valider un profil
  const handleValidatePersona = (persona: any) => {
    setValidatedPersonaIds(ids => [...ids, persona.id]);
    onSelectionChange([...selectedPersonas, persona]);
  };

  // Callback pour rejeter un profil
  const handleRejectPersona = (persona: any) => {
    setRemovedPersonaIds(ids => [...ids, persona.id]);
    // Ne pas ajouter à la sélection
  };

  // Bouton pour valider tous les profils non traités
  const handleValidateAll = () => {
    const untreatedIds = uniquePersonas.filter(p => !validatedPersonaIds.includes(p.id) && !removedPersonaIds.includes(p.id)).map(p => p.id);
    setValidatedPersonaIds(ids => [...ids, ...untreatedIds]);
    const toAdd = uniquePersonas.filter(p => untreatedIds.includes(p.id));
    onSelectionChange([...selectedPersonas, ...toAdd]);
  };

  return (
    <div className="space-y-4">
      {/* En-tête compacte */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sélection des profils à prospecter
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {uniquePersonas.length} profil(s) unique(s) trouvé(s)
            {duplicatesRemoved > 0 && (
              <span className="text-green-600 ml-2">
                ({duplicatesRemoved} doublon(s) automatiquement regroupé(s))
              </span>
            )}
            {filteredDuplicatePersonas.length > 0 && (
              <span className="text-orange-600 ml-2">
                • {filteredDuplicatePersonas.length} profil(s) avec plusieurs offres à traiter
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Sélectionner visibles
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Tout désélectionner
          </Button>
        </div>
      </div>

      {/* Filtres compacts */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par nom, poste, entreprise ou offre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-selected"
                checked={showOnlySelected}
                onCheckedChange={handleShowOnlySelectedChange}
              />
              <label htmlFor="show-selected" className="text-sm whitespace-nowrap">
                Seulement sélectionnés
              </label>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {selectedPersonas.length} sélectionné(s)
              </Badge>
              <Badge variant="outline">
                {uniquePersonas.length} unique(s)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section des doublons */}
      {filteredDuplicatePersonas.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Profils avec plusieurs offres ({filteredDuplicatePersonas.length})
            </CardTitle>
            <p className="text-sm text-orange-700">
              Ces profils apparaissent sur plusieurs offres. Choisissez pour quelle offre vous souhaitez les prospecter.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredDuplicatePersonas.map((persona) => {
              const personaKey = persona._personaKey;
              const selectedOfferId = duplicateSelections[personaKey];
              const isProcessing = processingDuplicates[personaKey];
              
              return (
                <div key={persona.id} className="bg-white p-4 rounded-lg border">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {persona.name || 'Nom non disponible'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {persona.title || 'Titre non disponible'}
                      </p>
                      {persona.company && (
                        <p className="text-xs text-gray-500">
                          Chez: {persona.company}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Offres disponibles */}
                  <div className="space-y-2 mb-3">
                    <p className="text-sm font-medium text-gray-700">Offres disponibles :</p>
                    {persona._jobOffers && persona._jobOffers.map((offer: any, idx: number) => (
                      <div key={`${offer.jobId}-${idx}`} className="flex items-center gap-2 p-2 border rounded">
                        <Checkbox
                          checked={selectedOfferId === offer.jobId}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleDuplicateOfferSelection(personaKey, offer.jobId);
                            } else {
                              setDuplicateSelections(prev => {
                                const newSelections = { ...prev };
                                delete newSelections[personaKey];
                                return newSelections;
                              });
                            }
                          }}
                          disabled={isProcessing}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Building className="h-4 w-4 text-gray-500" />
                            {/* Lien cliquable si offer.jobUrl existe */}
                            {offer.jobUrl ? (
                              <a href={offer.jobUrl} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline">
                                {offer.jobTitle || 'Titre non disponible'}
                              </a>
                            ) : (
                              offer.jobTitle || 'Titre non disponible'
                            )}
                          </div>
                          {/* Localisation si présente */}
                          {offer.jobLocation && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <MapPin className="h-3 w-3" />
                              {offer.jobLocation}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDuplicateValidation(persona)}
                      disabled={!selectedOfferId || isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                          Traitement...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Valider
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateSkip(persona)}
                      disabled={isProcessing}
                      className="text-gray-600"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Ignorer
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Zone principale avec les profils uniques */}
      <Card className="flex-1">
        <CardContent className="p-4">
          <BulkProspectingLeadCard
            personas={displayedPersonas}
            selectedPersonas={validatedPersonaIds}
            onAcceptPersona={handleValidatePersona}
            onRejectPersona={handleRejectPersona}
          />
          {untreatedPersonas.length > 0 && (
            <div className="flex justify-center mt-4">
                  <Button
                className="bg-green-600 hover:bg-green-700 px-8"
                onClick={handleValidateAll}
              >
                Valider tous les profils restants
                  </Button>
                        </div>
                      )}
          {filteredUniquePersonas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun profil ne correspond aux critères de recherche</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
