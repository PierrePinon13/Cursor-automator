
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePersonnaSearch } from "@/hooks/usePersonnaSearch";
import { Users } from "lucide-react";

export function JobsResultsList({ jobs, searchId, personnaFilters }: {
  jobs: any[];
  searchId: string;
  personnaFilters: any;
}) {
  const [filter, setFilter] = useState<"all" | "with-personas">("all");
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

  const listToShow = useMemo(() => {
    if (filter === "with-personas") {
      return jobs.filter(
        (job) => status[job.job_id]?.personas && status[job.job_id]?.personas.length > 0
      );
    }
    return jobs;
  }, [filter, jobs, status]);

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
          const personas = status[job.job_id]?.personas ?? [];
          const isLoading = status[job.job_id]?.isLoading ?? true;

          return (
            <Card
              key={job.job_id}
              className={`transition-all border-2
                ${!isLoading && personas.length > 0
                  ? "border-green-400"
                  : isLoading || !personas.length
                  ? "border-gray-200 bg-gray-100 opacity-60"
                  : ""}
              `}
            >
              <CardHeader>
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
                    <Badge key={i} variant="secondary" className="text-xs">
                      <a href={persona.profile_url} target="_blank" rel="noopener noreferrer">{persona.full_name}</a>
                    </Badge>
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
