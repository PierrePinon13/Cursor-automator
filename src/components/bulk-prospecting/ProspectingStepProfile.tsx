
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Search, Filter, Users, AlertTriangle, Building, Briefcase } from 'lucide-react';
import { DuplicatePersonaDialog } from './DuplicatePersonaDialog';

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
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [currentDuplicatePersona, setCurrentDuplicatePersona] = useState<any>(null);
  const [currentDuplicateOffers, setCurrentDuplicateOffers] = useState<any[]>([]);

  // Grouper les personas par identité unique et séparer ceux avec plusieurs offres
  const { uniquePersonas, duplicatePersonas, duplicatesRemoved } = useMemo(() => {
    const personaMap = new Map<string, any[]>();
    
    // Grouper par identité (nom + titre ou ID LinkedIn)
    jobData.personas.forEach(persona => {
      const key = persona.id || persona.linkedinId || `${persona.name}-${persona.title}`;
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
        persona._jobOffers = [{
          jobId: persona.jobId,
          jobTitle: persona.jobTitle,
          jobCompany: persona.jobCompany,
          jobLocation: persona.location
        }];
        unique.push(persona);
      } else {
        // Persona avec plusieurs offres - créer un persona consolidé
        removedCount += personas.length - 1;
        const representative = personas[0];
        representative._jobOffers = personas.map(p => ({
          jobId: p.jobId,
          jobTitle: p.jobTitle,
          jobCompany: p.jobCompany,
          jobLocation: p.location
        }));
        representative._isMultipleOffers = true;
        duplicates.push(representative);
      }
    });

    // Trier pour mettre les doublons en haut
    const sortedPersonas = [...duplicates, ...unique];

    return {
      uniquePersonas: sortedPersonas,
      duplicatePersonas: duplicates,
      duplicatesRemoved: removedCount
    };
  }, [jobData.personas]);

  const filteredPersonas = uniquePersonas.filter(persona => {
    const matchesSearch = !searchTerm || 
      persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      persona.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (persona.company && persona.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      persona._jobOffers?.some((offer: any) => 
        offer.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.jobCompany?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesFilter = !showOnlySelected || 
      selectedPersonas.some(selected => selected.id === persona.id);
    
    return matchesSearch && matchesFilter;
  });

  const togglePersona = (persona: any) => {
    // Si ce persona a plusieurs offres, ouvrir le dialog de sélection
    if (persona._isMultipleOffers && persona._jobOffers && persona._jobOffers.length > 1) {
      setCurrentDuplicatePersona(persona);
      setCurrentDuplicateOffers(persona._jobOffers);
      setDuplicateDialogOpen(true);
      return;
    }

    // Comportement normal pour persona unique
    const isSelected = selectedPersonas.some(selected => selected.id === persona.id);
    
    if (isSelected) {
      onSelectionChange(selectedPersonas.filter(selected => selected.id !== persona.id));
    } else {
      // Pour persona avec une seule offre, utiliser cette offre
      const personaWithJob = {
        ...persona,
        jobId: persona._jobOffers[0].jobId,
        jobTitle: persona._jobOffers[0].jobTitle,
        jobCompany: persona._jobOffers[0].jobCompany,
        location: persona._jobOffers[0].jobLocation
      };
      onSelectionChange([...selectedPersonas, personaWithJob]);
    }
  };

  const handleSelectOffer = (jobId: string) => {
    if (!currentDuplicatePersona) return;

    const selectedOffer = currentDuplicateOffers.find(offer => offer.jobId === jobId);
    if (!selectedOffer) return;

    const specificPersona = {
      ...currentDuplicatePersona,
      jobId: selectedOffer.jobId,
      jobTitle: selectedOffer.jobTitle,
      jobCompany: selectedOffer.jobCompany,
      location: selectedOffer.jobLocation,
      _selectedForOffer: selectedOffer.jobId
    };

    onSelectionChange([...selectedPersonas, specificPersona]);
  };

  const handleSkipPersona = () => {
    // Ne rien faire, juste fermer le dialog
  };

  const selectAll = () => {
    const allPersonasWithJobs = filteredPersonas
      .filter(persona => !persona._isMultipleOffers || persona._jobOffers?.length === 1)
      .map(persona => ({
        ...persona,
        jobId: persona._jobOffers[0].jobId,
        jobTitle: persona._jobOffers[0].jobTitle,
        jobCompany: persona._jobOffers[0].jobCompany,
        location: persona._jobOffers[0].jobLocation
      }));
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
            {filteredPersonas.length} profil(s) trouvé(s)
            {duplicatesRemoved > 0 && (
              <span className="text-green-600 ml-2">
                ({duplicatesRemoved} doublon(s) automatiquement regroupé(s))
              </span>
            )}
            {duplicatePersonas.length > 0 && (
              <span className="text-orange-600 ml-2">
                • {duplicatePersonas.length} profil(s) avec plusieurs offres
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

      {/* Zone principale avec plus d'espace pour les cartes */}
      <Card className="flex-1">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredPersonas.map((persona) => {
              const isSelected = selectedPersonas.some(selected => selected.id === persona.id);
              const hasMultipleOffers = persona._isMultipleOffers && persona._jobOffers?.length > 1;
              
              return (
                <div
                  key={persona.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : hasMultipleOffers
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => togglePersona(persona)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent click
                      className="mt-1"
                      disabled={hasMultipleOffers}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {persona.name}
                          </h4>
                          {hasMultipleOffers && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-orange-500" />
                              <span className="text-xs text-orange-600">
                                {persona._jobOffers.length} offres
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {persona.title}
                      </p>
                      {persona.company && (
                        <p className="text-xs text-gray-500 mb-2">
                          Chez: {persona.company}
                        </p>
                      )}
                      
                      {/* Affichage des offres d'emploi */}
                      <div className="space-y-1">
                        {hasMultipleOffers ? (
                          <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                            <div className="font-medium mb-1">Plusieurs offres disponibles:</div>
                            {persona._jobOffers.slice(0, 2).map((offer: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                <span className="truncate">{offer.jobTitle} - {offer.jobCompany}</span>
                              </div>
                            ))}
                            {persona._jobOffers.length > 2 && (
                              <div className="text-xs">
                                ... et {persona._jobOffers.length - 2} autre(s)
                              </div>
                            )}
                          </div>
                        ) : (
                          persona._jobOffers && persona._jobOffers[0] && (
                            <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                              <div className="flex items-center gap-1 mb-1">
                                <Building className="h-3 w-3" />
                                <span className="font-medium">{persona._jobOffers[0].jobCompany}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                <span className="truncate">{persona._jobOffers[0].jobTitle}</span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPersonas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun profil ne correspond aux critères de recherche</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour gérer les doublons */}
      <DuplicatePersonaDialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        persona={currentDuplicatePersona}
        duplicateOffers={currentDuplicateOffers}
        onSelectOffer={handleSelectOffer}
        onSkipPersona={handleSkipPersona}
      />
    </div>
  );
};
