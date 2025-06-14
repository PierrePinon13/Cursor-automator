
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SavedSearch {
  id: string;
  name: string;
  jobFilters: any;
  personaFilters: any;
  messageTemplate?: string;
  createdAt: Date;
  lastExecuted?: Date;
  resultsCount?: number;
}

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

export const useSearchJobs = () => {
  const [currentResults, setCurrentResults] = useState<JobResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Mock data for demonstration
  const savedSearches: SavedSearch[] = [
    {
      id: '1',
      name: 'Développeurs React Paris',
      jobFilters: {
        keywords: 'développeur react',
        location: ['Paris', 'Île-de-France'],
        date_posted: 'past_week',
        sort_by: 'date'
      },
      personaFilters: {
        keywords: 'startup innovation',
        role: ['CTO', 'Tech Lead'],
        profile_language: 'fr'
      },
      messageTemplate: 'Bonjour {{ firstName }}, j\'ai vu que {{ companyName }} recrute un {{ jobTitle }}...',
      createdAt: new Date('2024-01-15'),
      lastExecuted: new Date('2024-01-20'),
      resultsCount: 12
    }
  ];

  const executeSearch = useCallback(async (searchConfig: any) => {
    setIsLoading(true);
    
    try {
      // Appel à l'API N8N
      const response = await fetch('https://n8n.getpro.co/webhook/dbffc3a4-dba8-49b9-9628-109e8329ddb1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchConfig),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const data = await response.json();
      
      // Mock results for demonstration
      const mockResults: JobResult[] = [
        {
          id: '1',
          title: 'Senior React Developer',
          company: 'TechCorp',
          location: 'Paris, France',
          postedDate: new Date('2024-01-18'),
          description: 'Nous recherchons un développeur React expérimenté pour rejoindre notre équipe...',
          personas: [
            {
              id: '1',
              name: 'Jean Dupont',
              title: 'CTO',
              profileUrl: 'https://linkedin.com/in/jean-dupont'
            },
            {
              id: '2',
              name: 'Marie Martin',
              title: 'Tech Lead',
              profileUrl: 'https://linkedin.com/in/marie-martin'
            }
          ]
        },
        {
          id: '2',
          title: 'Frontend Developer React',
          company: 'StartupXYZ',
          location: 'Lyon, France',
          postedDate: new Date('2024-01-17'),
          description: 'Rejoignez notre équipe dynamique et participez au développement de notre plateforme...',
          personas: [
            {
              id: '3',
              name: 'Pierre Leroy',
              title: 'Engineering Manager',
              profileUrl: 'https://linkedin.com/in/pierre-leroy'
            }
          ]
        }
      ];

      setCurrentResults(mockResults);
      return data;
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSearch = useCallback(async (searchConfig: any) => {
    // Mock implementation - in real app, save to database
    console.log('Sauvegarde de la recherche:', searchConfig);
    return { id: Date.now().toString(), ...searchConfig };
  }, []);

  const deleteSearch = useCallback(async (searchId: string) => {
    // Mock implementation - in real app, delete from database
    console.log('Suppression de la recherche:', searchId);
    queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
  }, [queryClient]);

  return {
    savedSearches,
    currentResults,
    isLoading,
    executeSearch,
    createSearch,
    deleteSearch
  };
};
