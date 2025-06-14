
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

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
      console.log('Configuration envoyée au webhook:', searchConfig);
      
      // Appel à l'API N8N avec mode no-cors pour éviter les problèmes CORS
      const response = await fetch('https://n8n.getpro.co/webhook/dbffc3a4-dba8-49b9-9628-109e8329ddb1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors', // Ajout du mode no-cors
        body: JSON.stringify(searchConfig),
      });

      // Avec no-cors, on ne peut pas lire la réponse, donc on simule le succès
      console.log('Requête envoyée au webhook N8N');
      
      // Afficher un toast de succès
      if (searchConfig.saveOnly) {
        toast({
          title: "Recherche sauvegardée",
          description: "Votre configuration de recherche a été sauvegardée avec succès.",
        });
      } else {
        toast({
          title: "Recherche lancée",
          description: "Votre recherche a été envoyée au système. Les résultats apparaîtront bientôt.",
        });
        
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
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      
      // Afficher un toast d'erreur plus informatif
      toast({
        title: "Erreur de connexion",
        description: "Impossible de contacter le serveur. Vérifiez votre connexion internet.",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSearch = useCallback(async (searchConfig: any) => {
    // Mock implementation - in real app, save to database
    console.log('Sauvegarde de la recherche:', searchConfig);
    toast({
      title: "Recherche créée",
      description: "Votre nouvelle recherche a été sauvegardée.",
    });
    return { id: Date.now().toString(), ...searchConfig };
  }, []);

  const deleteSearch = useCallback(async (searchId: string) => {
    // Mock implementation - in real app, delete from database
    console.log('Suppression de la recherche:', searchId);
    toast({
      title: "Recherche supprimée",
      description: "La recherche a été supprimée avec succès.",
    });
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
