
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
 * Parse et sécurise le contenu personas venant de la DB.
 * Garantit toujours la forme {job_id, personas: Persona[]}, sinon [].
 */
function parsePersonasList(raw: any): Array<{ job_id: string; personas: Persona[] }> {
  if (!Array.isArray(raw)) return [];
  // On ne garde que les éléments valides et on les sanitize fortement
  return raw.filter(
    (item) =>
      !!item &&
      typeof item === "object" &&
      typeof item.job_id === "string" &&
      Array.isArray(item.personas)
  ).map((item) => ({
    job_id: String(item.job_id),
    personas: Array.isArray(item.personas)
      ? item.personas
          .filter((p) =>
            p &&
            typeof p === "object" &&
            typeof p.full_name === "string" &&
            typeof p.title === "string" &&
            typeof p.profile_url === "string"
          )
          // On caste vraiment chaque persona pour éviter les mauvaises surprises
          .map((p) => ({
            full_name: String(p.full_name),
            title: String(p.title),
            profile_url: String(p.profile_url),
            location: typeof p.location === "string" ? p.location : undefined,
          }))
      : [],
  }));
}

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
            // Nouvelle URL persona search
            "https://n8n.getpro.co/webhook/fb2a74b3-e840-400c-b788-f43972c61334",
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

  useEffect(() => {
    let interval: any;
    const poll = async () => {
      const { data, error } = await supabase
        .from("job_search_personas")
        .select("personas")
        .eq("search_id", searchId)
        .maybeSingle();

      if (error) return;

      const personasList = parsePersonasList(data?.personas);

      (jobs || []).forEach((job) => {
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
      interval = setInterval(poll, 2500);
    }
    return () => clearInterval(interval);
  }, [searchId, jobs]);

  return jobStatus;
}
