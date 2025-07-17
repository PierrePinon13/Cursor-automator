import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, MapPin, Calendar, Users, MessageSquare, X, ExternalLink, Euro, Briefcase, Filter, UserPlus, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { JobResultDetail } from './JobResultDetail';
import { CompanyLogo } from "./CompanyLogo";
import { useNavigate } from 'react-router-dom';
import { useHiddenJobs } from '@/hooks/useHiddenJobs';

// Palette de couleurs pour types d'offres (pour harmoniser)
const jobTypeColors: Record<string, { 
  card: string, 
  header: string, 
  badge: string 
}> = {
  'CDI': {
    card: 'bg-gradient-to-br from-blue-50/80 to-blue-100/60 border-blue-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-blue-100/80 to-blue-50/60 border-blue-200/60',
    badge: 'bg-blue-100/80 text-blue-800 border-blue-200/60'
  },
  'Freelance': {
    card: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/60 border-indigo-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-indigo-100/80 to-indigo-50/60 border-indigo-200/60',
    badge: 'bg-indigo-100/80 text-indigo-800 border-indigo-200/60'
  },
  'CDD': {
    card: 'bg-gradient-to-br from-green-50/80 to-green-100/60 border-green-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-green-100/80 to-green-50/60 border-green-200/60',
    badge: 'bg-green-100/80 text-green-800 border-green-200/60'
  },
  'Stage': {
    card: 'bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 border-yellow-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-yellow-100/80 to-yellow-50/60 border-yellow-200/60',
    badge: 'bg-yellow-100/80 text-yellow-800 border-yellow-200/60'
  }
};

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: Date;
  description: string;
  jobUrl?: string;
  salary?: string;
  messageTemplate?: string;
  personas: Array<{
    id: string;
    name: string;
    title: string;
    profileUrl: string;
    company?: string;
  }>;
  type?: string;
}

interface SearchResultsProps {
  results: JobResult[];
  isLoading: boolean;
  onHideJob?: (jobId: string) => void;
  showBulkProspectingButton?: boolean;
  onPersonaRemoved?: (jobId: string, personaId: string) => void;
  messageTemplate?: string;
}

export const SearchResults = ({ 
  results, 
  isLoading, 
  onHideJob,
  showBulkProspectingButton = true,
  onPersonaRemoved,
  messageTemplate = ''
}: SearchResultsProps) => {
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const { hiddenJobs, hideJob, showAllJobs, isJobHidden } = useHiddenJobs();
  const [personaFilter, setPersonaFilter] = useState<'all' | 'with-personas' | 'without-personas'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(() => {
    // Initialiser avec les sélections sauvegardées
    const saved = localStorage.getItem('selectedJobIds');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const handleHideJob = (jobId: string) => {
    hideJob(jobId);
    if (onHideJob) {
      onHideJob(jobId);
    }
    // Si l'offre était sélectionnée, la désélectionner
    if (selectedJobIds.has(jobId)) {
      handleToggleJobSelection(jobId);
    }
  };

  const handleToggleJobSelection = (jobId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      // Sauvegarder dans localStorage
      localStorage.setItem('selectedJobIds', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const handlePersonaRemoved = (jobId: string, personaId: string) => {
    if (onPersonaRemoved) {
      onPersonaRemoved(jobId, personaId);
    }
    // Fermer la modale si plus de personas
    if (selectedJob && selectedJob.id === jobId && selectedJob.personas.length === 1) {
      setSelectedJob(null);
    }
  };

  // Dédoublonnage par job_id (au cas où plusieurs objets aient le même dans la recherche)
  function deduplicateByJobId(jobs: JobResult[]) {
    const seen = new Set<string>();
    return jobs.filter((job) => {
      // Supporte à la fois job.id, job.job_id, etc.
      const jobIdValue =
        (job as any).job_id
        ?? job.id
        ?? (job as any).jobId;
      if (!jobIdValue) return true; // Cas pathologique, on laisse passer
      if (seen.has(jobIdValue)) return false;
      seen.add(jobIdValue);
      return true;
    });
  }

  // Extraire les villes uniques pour le filtre
  const uniqueCities = useMemo(() => {
    const cities = Array.from(new Set(
      results
        .map(job => job.location)
        .filter(location => location && location.trim() !== '')
    )).sort();
    return cities;
  }, [results]);

  // Appliquer les filtres ET exclure les jobs cachées
  const filteredResults = useMemo(() => {
    let filtered = deduplicateByJobId(results);
    
    // Exclure les jobs cachées
    filtered = filtered.filter(job => !isJobHidden(job.id));
    
    // Filtre par personas
    if (personaFilter === 'with-personas') {
      filtered = filtered.filter(job => job.personas && job.personas.length > 0);
    } else if (personaFilter === 'without-personas') {
      filtered = filtered.filter(job => !job.personas || job.personas.length === 0);
    }
    
    // Filtre par ville
    if (cityFilter !== 'all') {
      filtered = filtered.filter(job => job.location === cityFilter);
    }
    
    return filtered;
  }, [results, personaFilter, cityFilter, hiddenJobs]);

  const visibleResults = filteredResults;

  const handleBulkProspecting = (job: JobResult) => {
    if (!job.personas || job.personas.length === 0) return;
    
    // Construire les paramètres URL pour passer les données à la page de prospection
    const params = new URLSearchParams({
      searchId: 'single-job',
      searchName: `${job.title} - ${job.company}`,
      totalJobs: '1',
      totalPersonas: job.personas.length.toString(),
      personas: JSON.stringify(job.personas.map(persona => ({
        ...persona,
        jobTitle: job.title,
        jobCompany: job.company,
        jobId: job.id
      }))),
      template: job.messageTemplate || ''
    });
    
    navigate(`/bulk-prospecting?${params.toString()}`);
  };

  // Fonction pour la prospection volumique globale - EXCLUT les offres masquées
  const handleGlobalBulkProspecting = () => {
    // Utiliser les offres sélectionnées uniquement
    const selectedJobs = filteredResults.filter(job => selectedJobIds.has(job.id));
    const jobsWithPersonas = selectedJobs.filter(job => job.personas && job.personas.length > 0);
    
    if (jobsWithPersonas.length === 0) return;
    
    // Collecter tous les personas des offres sélectionnées
    const allPersonas = jobsWithPersonas.flatMap(job => 
      job.personas.map(persona => ({
        ...persona,
        jobTitle: job.title,
        jobCompany: job.company,
        jobId: job.id
      }))
    );
    
    const params = new URLSearchParams({
      searchId: 'bulk-search',
      searchName: `Prospection volumique`,
      totalJobs: jobsWithPersonas.length.toString(),
      totalPersonas: allPersonas.length.toString(),
      personas: JSON.stringify(allPersonas),
      template: messageTemplate
    });
    
    navigate(`/bulk-prospecting?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Recherche en cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (visibleResults.length === 0 && results.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Aucun résultat trouvé</p>
            <p>Lancez une recherche pour voir les offres d'emploi et leurs contacts.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleResults.length === 0 && hiddenJobs.size > 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Tous les résultats sont masqués</p>
            <Button
              variant="outline"
              onClick={showAllJobs}
              className="mt-2"
            >
              Afficher les {hiddenJobs.size} résultat(s) masqué(s)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {results.length} offre{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
              {selectedJobIds.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedJobIds.size} sélectionnée{selectedJobIds.size > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Filtres */}
              <div className="flex items-center gap-2">
                <Select value={personaFilter} onValueChange={(value: any) => setPersonaFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrer par contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les résultats</SelectItem>
                    <SelectItem value="with-personas">Avec contacts</SelectItem>
                    <SelectItem value="without-personas">Sans contacts</SelectItem>
                  </SelectContent>
                </Select>

                {uniqueCities.length > 0 && (
                  <Select value={cityFilter} onValueChange={(value: any) => setCityFilter(value)}>
                    <SelectTrigger className="w-[180px]">
                      <MapPin className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrer par ville" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les villes</SelectItem>
                      {uniqueCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Bouton de prospection volumique */}
              {showBulkProspectingButton && selectedJobIds.size > 0 && (
                <Button
                  onClick={handleGlobalBulkProspecting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Prospecter ({selectedJobIds.size} offre{selectedJobIds.size > 1 ? 's' : ''})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleResults.map((job) => {
              const colorSet = jobTypeColors[job.type || 'CDI'] || jobTypeColors['CDI'];
              const hasPersonas = job.personas && job.personas.length > 0;
              const isSelected = selectedJobIds.has(job.id);
              
              // Classes pour griser les cartes sans personas
              const cardOpacity = hasPersonas ? 'opacity-100' : 'opacity-60';
              const cardSaturation = hasPersonas ? 'saturate-100' : 'saturate-50';
              const cardClasses = `${colorSet.card} ${cardOpacity} ${cardSaturation} ${isSelected ? 'ring-2 ring-blue-400' : ''}`;

              return (
                <div 
                  key={job.id}
                  className={`${cardClasses} rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02] overflow-hidden flex flex-col min-h-[250px] relative group`}
                  onClick={() => setSelectedJob(job)}
                >
                  {/* Boutons d'action */}
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 ${isSelected ? 'bg-blue-100 hover:bg-blue-200' : 'hover:bg-blue-100'}`}
                      onClick={(e) => handleToggleJobSelection(job.id, e)}
                    >
                      <Check className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-red-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHideJob(job.id);
                      }}
                    >
                      <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
                    </Button>
                  </div>

                  {/* Header harmonisé --- LOGO --- NOM ENTREPRISE */}
                  <div className={`${colorSet.header} border-b p-4 flex items-center gap-3 min-h-[80px] backdrop-blur-sm`}>
                    <CompanyLogo company={job.company} className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {job.company}
                      </h3>
                      {job.jobUrl && (
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          onClick={e => e.stopPropagation()}
                        >
                          Voir l'offre
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <Badge className={`${colorSet.badge} px-3 py-1`}>
                      {job.type || 'CDI'}
                    </Badge>
                  </div>

                  {/* Corps de la carte */}
                  <div className="p-4 space-y-3 flex-1 bg-white/20 backdrop-blur-sm">
                    {/* 1ère ligne = Poste */}
                    <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {job.title}
                    </div>
                    {/* 2ᵉ ligne = Lieu */}
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-xs">
                      <Calendar className="h-4 w-4" />
                      Posté {formatDistanceToNow(job.postedDate, { addSuffix: true, locale: fr })}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {job.description}
                    </p>

                    {/* Section personas avec indicateur visuel */}
                    <div className="mt-4 flex items-center gap-2">
                      <Users className={`h-4 w-4 ${hasPersonas ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className={`text-sm ${hasPersonas ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        {hasPersonas ? (
                          <>
                            {job.personas.length} contact{job.personas.length > 1 ? 's' : ''} trouvé{job.personas.length > 1 ? 's' : ''}
                          </>
                        ) : (
                          'Aucun contact'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Footer avec bouton de prospection */}
                  {hasPersonas && (
                    <div className={`${colorSet.card} border-t p-3 flex justify-end`}>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBulkProspecting(job);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Prospecter
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de détail */}
      {selectedJob && (
        <JobResultDetail
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onPersonaRemoved={handlePersonaRemoved}
        />
      )}
    </>
  );
};
