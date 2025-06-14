
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Calendar, Users, MessageSquare, X, ExternalLink, Euro } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { JobResultDetail } from './JobResultDetail';

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: Date;
  description: string;
  jobUrl?: string;
  salary?: string;
  personas: Array<{
    id: string;
    name: string;
    title: string;
    profileUrl: string;
    company?: string;
  }>;
}

interface SearchResultsProps {
  results: JobResult[];
  isLoading: boolean;
  onHideJob?: (jobId: string) => void;
}

export const SearchResults = ({ results, isLoading, onHideJob }: SearchResultsProps) => {
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [hiddenJobs, setHiddenJobs] = useState<Set<string>>(new Set());

  const hideJob = (jobId: string) => {
    setHiddenJobs(prev => new Set([...prev, jobId]));
    if (onHideJob) {
      onHideJob(jobId);
    }
  };

  const visibleResults = results.filter(job => !hiddenJobs.has(job.id));

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
          <CardTitle className="flex items-center justify-between">
            <span>Résultats de recherche ({visibleResults.length})</span>
            {hiddenJobs.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHiddenJobs(new Set())}
              >
                Afficher les résultats masqués ({hiddenJobs.size})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleResults.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group relative">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Bouton de suppression en haut à droite */}
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          hideJob(job.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Titre de l'offre */}
                    <div className="pr-8">
                      <h3 
                        className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer"
                        onClick={() => setSelectedJob(job)}
                      >
                        {job.title}
                      </h3>
                    </div>

                    {/* Détails de l'offre */}
                    <div className="space-y-2 text-sm text-gray-600">
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

                      {job.salary && (
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4" />
                          <span className="font-medium text-green-600">{job.salary}</span>
                        </div>
                      )}
                    </div>

                    {/* Description courte */}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {job.description}
                    </p>

                    {/* Personas trouvés */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Users className="h-4 w-4" />
                        Contacts trouvés ({job.personas.length})
                      </div>
                      
                      {job.personas.length > 0 && (
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

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => setSelectedJob(job)}
                        className="flex-1 flex items-center gap-2"
                        size="sm"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Prendre contact
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de détail */}
      {selectedJob && (
        <JobResultDetail
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </>
  );
};
