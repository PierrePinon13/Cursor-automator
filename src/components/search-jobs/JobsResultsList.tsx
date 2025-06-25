
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePersonnaSearch } from "@/hooks/usePersonnaSearch";
import { Users, X } from "lucide-react";
import { usePersonaSelections } from "@/hooks/usePersonaSelections";

export function JobsResultsList({ jobs, searchId, personnaFilters }: {
  jobs: any[];
  searchId: string;
  personnaFilters: any;
}) {
  const [filter, setFilter] = useState<"all" | "with-personas">("all");
  const [deletedJobIds, setDeletedJobIds] = useState<Set<string>>(new Set());
  const [removedPersonas, setRemovedPersonas] = useState<Set<string>>(new Set());
  
  // Hook to handle personna search for each job
  const status = usePersonnaSearch({
    searchId,
    jobs: jobs.map(job => ({
      job_id: job.job_id,
      company_name: job.company_name,
      company_id: job.company_id,
      personna_filters: personnaFilters,
    })),
  });

  // Hook pour gérer les sélections de personas
  const { updatePersonaStatus } = usePersonaSelections(searchId);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => !deletedJobIds.has(job.job_id));
  }, [jobs, deletedJobIds]);

  const listToShow = useMemo(() => {
    if (filter === "with-personas") {
      return filteredJobs.filter(
        (job) => {
          const personas = status[job.job_id]?.personas || [];
          // Filtrer les personas qui n'ont pas été supprimés
          const activePersonas = personas.filter((persona: any) => 
            !removedPersonas.has(persona.id || persona.full_name)
          );
          return activePersonas.length > 0;
        }
      );
    }
    return filteredJobs;
  }, [filter, filteredJobs, status, removedPersonas]);

  const handleDeleteJob = (jobId: string) => {
    setDeletedJobIds(prev => new Set([...prev, jobId]));
    
    // Store deleted job IDs in localStorage for bulk prospecting exclusion
    const existingDeleted = JSON.parse(localStorage.getItem('deletedJobIds') || '[]');
    const updatedDeleted = [...existingDeleted, jobId];
    localStorage.setItem('deletedJobIds', JSON.stringify(updatedDeleted));
  };

  const handleRemovePersona = async (personaId: string, jobId: string) => {
    try {
      // Marquer le persona comme supprimé localement
      setRemovedPersonas(prev => new Set([...prev, personaId]));
      
      // Mettre à jour en base de données via le hook usePersonaSelections
      await updatePersonaStatus(personaId, jobId, 'removed');
      
      console.log('Persona supprimé de la job offer:', { personaId, jobId });
      
    } catch (error) {
      console.error('Erreur lors de la suppression du persona:', error);
      // Annuler la suppression locale en cas d'erreur
      setRemovedPersonas(prev => {
        const newSet = new Set(prev);
        newSet.delete(personaId);
        return newSet;
      });
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-2 gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Toutes les offres
        </Button>
        <Button
          variant={filter === "with-personas" ? "default" : "outline"}
          onClick={() => setFilter("with-personas")}
        >
          Avec personas trouvés
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listToShow.length === 0 && (
          <div className="col-span-full flex flex-col items-center text-gray-400 py-12">
            <Users className="h-12 w-12" />
            <div className="mt-4 text-lg">Aucune offre à afficher.</div>
          </div>
        )}
        {listToShow.map((job) => {
          const allPersonas = status[job.job_id]?.personas ?? [];
          const personas = allPersonas.filter((persona: any) => 
            !removedPersonas.has(persona.id || persona.full_name)
          );
          const isLoading = status[job.job_id]?.isLoading ?? true;

          return (
            <Card
              key={job.job_id}
              className={`transition-all border-2 relative
                ${!isLoading && personas.length > 0
                  ? "border-green-400"
                  : isLoading || !personas.length
                  ? "border-gray-200 bg-gray-100 opacity-60"
                  : ""}
              `}
            >
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-red-100"
                onClick={() => handleDeleteJob(job.job_id)}
              >
                <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
              </Button>
              
              <CardHeader className="pr-10">
                <CardTitle className="flex items-center gap-2">
                  {job.job_title}
                  {isLoading && (
                    <span className="ml-2 text-xs text-gray-400 animate-pulse">chargement des personas…</span>
                  )}
                  {!isLoading && personas.length === 0 && (
                    <span className="ml-2 text-xs text-gray-400">Aucun contact</span>
                  )}
                  {!isLoading && personas.length > 0 && (
                    <Badge className="ml-2 bg-green-100 border-green-400 text-green-800 px-3 py-1">
                      {personas.length} contacts trouvés
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  {job.company_name} <br />
                  <span className="text-sm text-gray-500">{job.location}</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {new Date(job.posted_date).toLocaleDateString()}
                </p>
                <p className="mt-2 text-sm">{job.job_description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {personas.map((persona: any, i: number) => (
                    <div key={i} className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        <a 
                          href={persona.profile_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {persona.full_name}
                        </a>
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-red-100 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePersona(persona.id || persona.full_name, job.job_id);
                        }}
                        title="Supprimer ce contact"
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
