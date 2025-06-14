
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Calendar, Users, MessageSquare, X } from 'lucide-react';
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
  personas: Array<{
    id: string;
    name: string;
    title: string;
    profileUrl: string;
  }>;
}

interface SearchResultsProps {
  results: JobResult[];
  isLoading: boolean;
}

export const SearchResults = ({ results, isLoading }: SearchResultsProps) => {
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [hiddenJobs, setHiddenJobs] = useState<Set<string>>(new Set());

  const hideJob = (jobId: string) => {
    setHiddenJobs(prev => new Set([...prev, jobId]));
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

  if (visibleResults.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Aucun résultat trouvé</p>
            <p>Essayez de modifier vos critères de recherche.</p>
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
              <Card key={job.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* En-tête avec bouton de suppression */}
                    <div className="flex items-start justify-between">
                      <h3 
                        className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2"
                        onClick={() => setSelectedJob(job)}
                      >
                        {job.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          hideJob(job.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
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

                    {/* Action */}
                    <Button
                      onClick={() => setSelectedJob(job)}
                      className="w-full flex items-center gap-2"
                      size="sm"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Prendre contact
                    </Button>
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
