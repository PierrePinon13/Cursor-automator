
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Persona {
  full_name: string;
  title: string;
  location?: string;
  profile_url: string;
}

interface JobPersonasStatus {
  [jobId: string]: {
    isLoading: boolean;
    personas?: Persona[];
    error?: string;
  };
}

interface UsePersonnaSearchOptions {
  searchId: string;
  jobs: Array<{
    job_id: string;
    company_name: string;
    company_id?: string;
    personna_filters: any;
  }>;
}

/**
 * Fonction utilitaire : extrait la liste des personas d’un JSON venant de la DB
 */
function extractPersonasPerJob(raw: any): Array<{ job_id: string; personas: Persona[] }> {
  if (!Array.isArray(raw)) return [];
  // On ne garde que les objets au bon format
  return raw.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.job_id === "string" &&
      Array.isArray(item.personas)
  ) as Array<{ job_id: string; personas: Persona[] }>;
}

/**
 * Ce hook :
 * - Appelle n8n pour chaque job_id afin de déclencher la recherche personas
 * - Poll Dynamiquement la base pour chaque job_id pour peupler la réponse
 * - Renvoie loading/loaded/personas/error pour chaque job_id
 */
export function usePersonnaSearch({ searchId, jobs }: UsePersonnaSearchOptions) {
  const [jobStatus, setJobStatus] = useState<JobPersonasStatus>({});
  const launchedRef = useRef<{ [jobId: string]: boolean }>({});

  useEffect(() => {
    async function launchPersonnaSearch() {
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];

        if (launchedRef.current[job.job_id]) continue;
        launchedRef.current[job.job_id] = true;

        setJobStatus((prev) => ({
          ...prev,
          [job.job_id]: { isLoading: true },
        }));

        try {
          await fetch(
            "https://n8n.getpro.co/webhook/dbffc3a4-dba8-49b9-9628-109e8329ddb1",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                search_type: "personna",
                search_id: searchId,
                job_id: job.job_id,
                company_name: job.company_name,
                company_id: job.company_id,
                personna_filters: job.personna_filters,
              }),
            }
          );
          // On rate-limit si > 25, ici minimum 200ms
          await new Promise((r) =>
            setTimeout(r, jobs.length > 25 ? 1000 : 200)
          );
        } catch (err: any) {
          setJobStatus((prev) => ({
            ...prev,
            [job.job_id]: {
              isLoading: false,
              personas: [],
              error: String(err),
            },
          }));
        }
      }
    }
    if (jobs.length > 0) launchPersonnaSearch();
  }, [searchId, jobs]);

  // Synchronise jobStatus avec la DB
  useEffect(() => {
    let interval: any;
    const poll = async () => {
      // Charge l’entrée globale personas pour la recherche
      const { data, error } = await supabase
        .from("job_search_personas")
        .select("personas")
        .eq("search_id", searchId)
        .maybeSingle();

      if (error) {
        return;
      }

      const personasList = extractPersonasPerJob(data?.personas);

      (jobs || []).forEach((job) => {
        // On cherche l'objet correspondant au job_id
        const found = personasList.find((p) => p.job_id === job.job_id);
        const personasForJob: Persona[] = found ? found.personas : [];
        setJobStatus((prev) => ({
          ...prev,
          [job.job_id]: { isLoading: false, personas: personasForJob },
        }));
      });
    };
    if (searchId && jobs.length) {
      poll();
      interval = setInterval(poll, 2500); // refresh toutes les 2,5s
    }
    return () => clearInterval(interval);
  }, [searchId, jobs]);

  return jobStatus;
}
