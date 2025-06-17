import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, MapPin, Calendar, Users, MessageSquare, X, ExternalLink, Euro, Briefcase, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { JobResultDetail } from './JobResultDetail';
import { CompanyLogo } from "./CompanyLogo";

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
}

export const SearchResults = ({ results, isLoading, onHideJob }: SearchResultsProps) => {
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [hiddenJobs, setHiddenJobs] = useState<Set<string>>(new Set());
  const [personaFilter, setPersonaFilter] = useState<'all' | 'with-personas' | 'without-personas'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  const hideJob = (jobId: string) => {
    setHiddenJobs(prev => new Set([...prev, jobId]));
    if (onHideJob) {
      onHideJob(jobId);
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

  // Appliquer les filtres
  const filteredResults = useMemo(() => {
    let filtered = deduplicateByJobId(results);
    
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
  }, [results, personaFilter, cityFilter]);

  const visibleResults = filteredResults.filter(job => !hiddenJobs.has(job.id));

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
              onClick={() => setHiddenJobs(new Set())}
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
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <span>Résultats de recherche ({visibleResults.length})</span>
            
            {/* Filtres */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={personaFilter} onValueChange={(value: any) => setPersonaFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les offres</SelectItem>
                    <SelectItem value="with-personas">Avec contacts</SelectItem>
                    <SelectItem value="without-personas">Sans contacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {uniqueCities.length > 1 && (
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Toutes les villes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {hiddenJobs.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHiddenJobs(new Set())}
                >
                  Afficher les résultats masqués ({hiddenJobs.size})
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleResults.map((job) => {
              const colorSet = jobTypeColors[job.type || 'CDI'] || jobTypeColors['CDI'];
              const hasPersonas = job.personas && job.personas.length > 0;
              
              // Classes pour griser les cartes sans personas
              const cardOpacity = hasPersonas ? 'opacity-100' : 'opacity-60';
              const cardSaturation = hasPersonas ? 'saturate-100' : 'saturate-50';
              const cardClasses = `${colorSet.card} ${cardOpacity} ${cardSaturation}`;

              return (
                <div 
                  key={`${job.id}-${job.title}-${Date.now()}`}
                  className={`${cardClasses} rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02] overflow-hidden flex flex-col min-h-[250px] relative group`}
                  onClick={(e) => {
                    // Empêcher le clic si c'est sur le bouton de suppression
                    if ((e.target as HTMLElement).closest('button[aria-label="Masquer l\'offre"]')) {
                      return;
                    }
                    setSelectedJob(job);
                  }}
                >
                  {/* Header harmonisé --- LOGO --- NOM ENTREPRISE */}
                  <div className={`${colorSet.header} ${cardSaturation} p-4 border-b min-h-[62px] flex items-center justify-between flex-shrink-0 backdrop-blur-sm`}>
                    <div className="flex items-center gap-3 flex-1 min-h-0">
                      {/* Logo entreprise */}
                      <CompanyLogo
                        logoUrl={job["company_logo"]}
                        companyName={job.company}
                        size={36}
                        className="mr-2 shadow-sm"
                      />
                      {/* Nom entreprise à droite du logo */}
                      <div className="flex flex-col min-h-0 justify-center flex-1">
                        <div className="font-bold text-lg text-gray-800 leading-tight mb-0.5">
                          {job.company}
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-3 py-1 ${colorSet.badge} border font-semibold backdrop-blur-sm`}
                      >
                        {job.type || 'CDI'}
                      </Badge>
                    </div>
                  </div>

                  {/* Bouton de suppression flottant */}
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        hideJob(job.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 h-6 w-6"
                      aria-label="Masquer l'offre"
                    >
                      <X className="h-3 w-3" />
                    </Button>
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
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                        <Users className="h-4 w-4" />
                        <span>Contacts ({job.personas?.length || 0})</span>
                        {!hasPersonas && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Aucun contact
                          </Badge>
                        )}
                      </div>
                      {hasPersonas && (
                        <div className="flex flex-wrap gap-1">
                          {job.personas.slice(0, 3).map((persona) => (
                            <Badge key={persona.id} variant="secondary" className="text-xs">
                              {persona.name}
                            </Badge>
                          ))}
                          {job.personas.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.personas.length - 3} autres
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Footer harmonisé */}
                  <div className={`bg-white/30 backdrop-blur-sm px-4 py-3 border-t border-gray-200/40 flex-shrink-0 ${cardSaturation}`}>
                    <div className="flex items-center justify-between text-xs text-gray-700">
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="flex items-center gap-2"
                        size="sm"
                        disabled={!hasPersonas}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {hasPersonas ? 'Prendre contact' : 'Aucun contact'}
                      </Button>  
                      {job.jobUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="px-3"
                        >
                          <a
                            href={job.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de détail */}
      {selectedJob && (
        <JobResultDetail
          job={{
            ...selectedJob,
            messageTemplate: selectedJob.messageTemplate
          }}
          key={`job-detail-${selectedJob.id}-${Date.now()}`}
        />
      )}
    </>
  );
};
