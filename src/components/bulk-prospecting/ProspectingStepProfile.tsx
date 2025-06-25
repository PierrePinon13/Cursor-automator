
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Search, Filter, Users, AlertTriangle, Building, Briefcase, CheckCircle, X } from 'lucide-react';

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
}

export const ProspectingStepProfile = ({ 
  jobData, 
  selectedPersonas, 
  onSelectionChange 
}: ProspectingStepProfileProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [duplicateSelections, setDuplicateSelections] = useState<{ [personaKey: string]: string }>({});
  const [processedDuplicates, setProcessedDuplicates] = useState<Set<string>>(new Set());
  const [removedPersonas, setRemovedPersonas] = useState<Set<string>>(new Set());
  const [validatedDuplicates, setValidatedDuplicates] = useState<Set<string>>(new Set());

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
    
    // Grouper par identité (nom + titre ou ID LinkedIn) en excluant les personas supprimés
    jobData.personas.forEach(persona => {
      if (!persona || typeof persona !== 'object') return;
      if (removedPersonas.has(persona.id)) return; // Ignorer les personas supprimés
      
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
      // Ignorer si ce doublon a déjà été traité et validé
      if (processedDuplicates.has(key) && validatedDuplicates.has(key)) {
        return;
      }

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
        // Persona avec plusieurs offres
        if (!validatedDuplicates.has(key)) {
          // Afficher seulement les doublons non validés
          removedCount += personas.length - 1;
          const representative = personas[0];
          if (representative && typeof representative === 'object') {
            representative._jobOffers = personas
              .filter(p => p && typeof p === 'object')
              .map(p => ({
                jobId: p.jobId || jobData.id,
                jobTitle: p.jobTitle || jobData.title,
                jobCompany: p.jobCompany || jobData.company,
                jobLocation: p.location
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
  }, [jobData, processedDuplicates, removedPersonas, validatedDuplicates]);

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
    }
  };

  const handleDuplicateOfferSelection = (personaKey: string, jobOfferId: string) => {
    setDuplicateSelections(prev => ({
      ...prev,
      [personaKey]: jobOfferId
    }));
  };

  const handleDuplicateValidation = (persona: any) => {
    const personaKey = persona._personaKey;
    const selectedOfferId = duplicateSelections[personaKey];
    
    if (!selectedOfferId) return;
    
    const selectedOffer = persona._jobOffers.find((offer: any) => offer.jobId === selectedOfferId);
    if (!selectedOffer) return;

    const specificPersona = {
      ...persona,
      jobId: selectedOffer.jobId,
      jobTitle: selectedOffer.jobTitle,
      jobCompany: selectedOffer.jobCompany,
      location: selectedOffer.jobLocation,
      _selectedForOffer: selectedOffer.jobId
    };

    // Ajouter à la sélection
    onSelectionChange([...selectedPersonas, specificPersona]);
    
    // Marquer ce doublon comme traité ET validé
    setProcessedDuplicates(prev => new Set([...prev, personaKey]));
    setValidatedDuplicates(prev => new Set([...prev, personaKey]));
    
    // Nettoyer la sélection
    setDuplicateSelections(prev => {
      const newSelections = { ...prev };
      delete newSelections[personaKey];
      return newSelections;
    });
  };

  const handleDuplicateSkip = (persona: any) => {
    const personaKey = persona._personaKey;
    
    // Marquer ce doublon comme traité (ignoré) ET validé
    setProcessedDuplicates(prev => new Set([...prev, personaKey]));
    setValidatedDuplicates(prev => new Set([...prev, personaKey]));
    
    // Nettoyer la sélection
    setDuplicateSelections(prev => {
      const newSelections = { ...prev };
      delete newSelections[personaKey];
      return newSelections;
    });
  };

  const handleRemovePersona = (personaId: string) => {
    // Ajouter à la liste des personas supprimés (persistant)
    setRemovedPersonas(prev => new Set([...prev, personaId]));
    
    // Supprimer de la sélection s'il y était
    const updatedSelection = selectedPersonas.filter(selected => selected && selected.id !== personaId);
    onSelectionChange(updatedSelection);
  };

  const selectAll = () => {
    const allPersonasWithJobs = filteredUniquePersonas
      .filter(persona => !removedPersonas.has(persona.id)) // Exclure les personas supprimés
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
    onSelectionChange(allPersonasWithJobs);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const handleShowOnlySelectedChange = (checked: boolean | "indeterminate") => {
    setShowOnlySelected(checked === true);
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
                • {filteredDuplicatePersonas.length} profil(s) avec plusieurs offres
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
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Building className="h-4 w-4 text-gray-500" />
                            {offer.jobCompany || 'Entreprise non disponible'}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Briefcase className="h-3 w-3" />
                            {offer.jobTitle || 'Titre non disponible'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDuplicateValidation(persona)}
                      disabled={!selectedOfferId}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateSkip(persona)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredUniquePersonas.map((persona) => {
              if (!persona || typeof persona !== 'object') return null;
              if (removedPersonas.has(persona.id)) return null; // Ne pas afficher les personas supprimés
              
              const isSelected = selectedPersonas.some(selected => selected && selected.id === persona.id);
              
              return (
                <div
                  key={persona.id || `persona-${Math.random()}`}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 relative ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => togglePersona(persona)}
                >
                  {/* Bouton supprimer */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePersona(persona.id);
                    }}
                    className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-red-50 hover:border-red-200 text-red-600"
                    title="Supprimer ce contact"
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  <div className="flex items-start gap-3 pr-8">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent click
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {persona.name || 'Nom non disponible'}
                          </h4>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {persona.title || 'Titre non disponible'}
                      </p>
                      {persona.company && (
                        <p className="text-xs text-gray-500 mb-2">
                          Chez: {persona.company}
                        </p>
                      )}
                      
                      {/* Affichage de l'offre d'emploi */}
                      {persona._jobOffers && persona._jobOffers[0] && (
                        <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                          <div className="flex items-center gap-1 mb-1">
                            <Building className="h-3 w-3" />
                            <span className="font-medium">{persona._jobOffers[0].jobCompany || 'Entreprise non disponible'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            <span className="truncate">{persona._jobOffers[0].jobTitle || 'Titre non disponible'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
