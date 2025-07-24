import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Phone } from 'lucide-react';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, X, Check, Loader2 } from 'lucide-react';
import MultiSelectFilter from '@/components/leads/MultiSelectFilter';
import { Input } from '@/components/ui/input';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import { useLeads } from '@/hooks/useLeads';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LeadSelectionCard } from '@/components/leads/LeadSelectionCard';
import CompanyHoverCard from '@/components/leads/CompanyHoverCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const DESIGN = {
  colors: {
    primary: '#008394',
    primaryLight: '#E6F6F8',
    secondary: '#F4F4F4',
    accent: '#FBD144',
    background: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textMuted: '#999999',
    tagBackground: '#EAF3F4',
    tagText: '#005E68',
    buttonBorder: '#CCCCCC',
    ratingStar: '#FDB022',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    fontSizes: {
      heading: '20px',
      subheading: '16px',
      body: '14px',
      caption: '12px',
    },
    fontWeights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      default: '1.5',
      heading: '1.2',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borders: {
    radiusSm: '4px',
    radiusMd: '8px',
    radiusLg: '12px',
    cardRadius: '16px',
  },
  buttons: {
    primary: {
      background: '#008394',
      color: '#FFFFFF',
      borderRadius: '24px',
      padding: '8px 16px',
    },
    secondary: {
      background: '#FFFFFF',
      color: '#008394',
      border: '1px solid #008394',
      borderRadius: '24px',
      padding: '8px 16px',
    },
    iconButton: {
      background: '#FFFFFF',
      border: '1px solid #CCCCCC',
      borderRadius: '24px',
      padding: '6px',
    },
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    padding: '16px',
    gap: '12px',
  },
  tags: {
    background: '#EAF3F4',
    color: '#005E68',
    borderRadius: '16px',
    padding: '4px 8px',
    fontSize: '12px',
  },
  layout: {
    grid: {
      columns: 3,
      gap: '16px',
    },
    header: {
      padding: '24px 32px',
    },
    footer: {
      padding: '16px 32px',
      borderTop: '1px solid #E0E0E0',
    },
  },
  transitions: {
    default: 'all 0.3s ease',
  },
};

const MOCK_FILTERS = [
  { id: 'location', label: 'Localisation' },
  { id: 'job', label: 'Poste' },
  { id: 'company', label: 'Entreprise' },
  { id: 'experience', label: 'Expérience' },
];

const MOCK_LEADS = [
  { id: '1', name: 'Alice Martin', title: 'Product Manager', company: 'Qonto', location: 'Paris', tags: ['SaaS', 'Fintech'] },
  { id: '2', name: 'Benoit Dupont', title: 'Lead Dev', company: 'Doctolib', location: 'Lyon', tags: ['Health', 'Tech'] },
  { id: '3', name: 'Claire Dubois', title: 'Growth', company: 'Swile', location: 'Remote', tags: ['Growth', 'B2B'] },
  { id: '4', name: 'David Leroy', title: 'CTO', company: 'Alan', location: 'Paris', tags: ['CTO', 'Scaleup'] },
  { id: '5', name: 'Emma Petit', title: 'CMO', company: 'PayFit', location: 'Bordeaux', tags: ['CMO', 'RH'] },
  { id: '6', name: 'Fabrice Morel', title: 'VP Sales', company: 'Spendesk', location: 'Paris', tags: ['Sales', 'SaaS'] },
];

export default function LeadSelectionPage() {
  const { toast } = useToast();
  const { unipileAccountId } = useLinkedInConnection();
  const { retrievePhone } = usePhoneRetrieval();
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isRetrievingAllPhones, setIsRetrievingAllPhones] = useState(false);
  const [filters, setFilters] = useState(MOCK_FILTERS);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [removedLeads, setRemovedLeads] = useState<string[]>([]);
  const [searchLaunched, setSearchLaunched] = useState(false);
  const [showProspectingView, setShowProspectingView] = useState(false);
  const [messages, setMessages] = useState<{ [key: string]: string }>({});
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number>(0);
  const navigate = useNavigate();
  const [prevLeads, setPrevLeads] = useState<any[]>([]);
  const [cards, setCards] = useState<(any | null)[]>([null, null, null, null, null, null]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [validatedCards, setValidatedCards] = useState<number[]>([]); // index des cartes validées
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [validatedLeads, setValidatedLeads] = useState<any[]>([]);
  const [nextLeadIndex, setNextLeadIndex] = useState(0);

  const {
    filteredLeads,
    selectedCategories,
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedContactFilter,
    setSelectedContactFilter,
    selectedCompanyCategories,
    setSelectedCompanyCategories,
    minEmployees,
    setMinEmployees,
    maxEmployees,
    setMaxEmployees,
    availableCategories,
    availableCompanyCategories,
    loading: leadsLoading,
    refreshLeads
  } = useLeads();

  // Initialiser les secteurs à exclure par défaut
  useEffect(() => {
    setSelectedCompanyCategories(['esn', 'cabinet de recrutement']);
  }, []);

  // Charger le premier lead au démarrage
  useEffect(() => {
    if (searchLaunched && filteredLeads.length > 0 && !cards[0]) {
      setCards([filteredLeads[0], null, null, null, null, null]);
      setCurrentIndex(0);
      setRemovedLeads([]);
      setValidatedCards([]);
    }
  }, [searchLaunched, filteredLeads]);

  // Charger une nouvelle carte à l'index donné
  const loadNextLead = async (index: number) => {
    const usedIds = cards.filter(Boolean).map(l => l.id).concat(removedLeads);
    const nextLead = filteredLeads.find(l => !usedIds.includes(l.id));
    if (nextLead) {
      // Lock le lead en BDD pour l'utilisateur courant
      await supabase
        .from('leads')
        .update({
          selection_status: 'in_selection',
          selected_by_user_id: user?.id,
          selected_at: new Date().toISOString(),
        })
        .eq('id', nextLead.id);
    }
    setCards(prev => {
      const newCards = [...prev];
      newCards[index] = nextLead || null;
      return newCards;
    });
  };


  // Mettre à jour les leads affichés quand les leads filtrés changent
  useEffect(() => {
    if (searchLaunched) {
      // Filtrage locking/rejected/accepted
      const now = new Date();
      const filtered = filteredLeads.filter(lead => {
        // Si rejected et rejected_at > latest_post_date => on n'affiche pas
        if (
          lead.selection_status === 'rejected' &&
          lead.rejected_at &&
          lead.latest_post_date &&
          new Date(lead.rejected_at) > new Date(lead.latest_post_date)
        ) {
          return false;
        }
        // Si in_selection par un autre user et moins de 10min => on n'affiche pas
        if (
          lead.selection_status === 'in_selection' &&
          lead.selected_by_user_id &&
          user?.id &&
          lead.selected_by_user_id !== user.id &&
          lead.selected_at &&
          (now.getTime() - new Date(lead.selected_at).getTime()) < 10 * 60 * 1000
        ) {
          return false;
        }
        // Si accepted il y a moins de 30min par un autre user => on n'affiche pas
        if (
          lead.selection_status === 'accepted' &&
          lead.accepted_at &&
          lead.accepted_by_user !== user?.id &&
          (now.getTime() - new Date(lead.accepted_at).getTime()) < 30 * 60 * 1000
        ) {
          return false;
        }
        return true;
      });
      const leadsToShow = filtered.slice(0, 6);
      setLeads(leadsToShow);
      // Lock en base les leads affichés
      leadsToShow.forEach(async (lead) => {
        if (
          lead.selection_status !== 'in_selection' ||
          lead.selected_by_user_id !== user?.id
        ) {
          await supabase
            .from('leads')
            .update({
              selection_status: 'in_selection',
              selected_by_user_id: user?.id,
              selected_at: new Date().toISOString(),
            })
            .eq('id', lead.id);
        }
      });
    }
  }, [filteredLeads, searchLaunched, user]);

  // Obtenir le lead sélectionné actuel
  const selectedLead = selectedLeads[selectedLeadIndex] 
    ? leads.find(l => l.id === selectedLeads[selectedLeadIndex]) 
    : null;

  // Gérer le changement de message
  const handleMessageChange = (message: string) => {
    setMessages(prev => ({
      ...prev,
      [selectedLeadIndex]: message
    }));
  };

  const dateFilterOptions = [
    { value: '24h', label: 'Dernières 24h' },
    { value: '48h', label: 'Dernières 48h' },
    { value: '7days', label: 'Derniers 7 jours' },
    { value: 'all', label: 'Tout' },
  ];
  const contactFilterOptions = [
    { value: 'exclude_none', label: 'Inclure tous' },
    { value: 'exclude_1week', label: 'Exclure contactés (1 semaine)' },
    { value: 'exclude_2weeks', label: 'Exclure contactés (2 semaines)' },
    { value: 'exclude_1month', label: 'Exclure contactés (1 mois)' },
    { value: 'exclude_all_contacted', label: 'Exclure tous contactés' },
    { value: 'only_my_contacts', label: 'Mes contacts uniquement' },
  ];
  const categoryColors = {
    'Tech': 'bg-blue-100 text-blue-800 border-blue-300',
    'Business': 'bg-green-100 text-green-800 border-green-300',
    'Product': 'bg-purple-100 text-purple-800 border-purple-300',
    'Executive Search': 'bg-red-100 text-red-800 border-red-300',
    'Comptelio': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'RH': 'bg-pink-100 text-pink-800 border-pink-300',
    'Freelance': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Data': 'bg-teal-100 text-teal-800 border-teal-300',
  };

  // Gestion de l'ordre des filtres (up/down)
  const moveFilter = (index: number, direction: 'up' | 'down') => {
    const newFilters = [...filters];
    if (direction === 'up' && index > 0) {
      [newFilters[index - 1], newFilters[index]] = [newFilters[index], newFilters[index - 1]];
    } else if (direction === 'down' && index < newFilters.length - 1) {
      [newFilters[index + 1], newFilters[index]] = [newFilters[index], newFilters[index + 1]];
    }
    setFilters(newFilters);
  };

  // Gérer la sélection d'un lead
  const handleSelectLead = (id: string) => {
    // Si le lead est déjà sélectionné, on le désélectionne
    if (selectedLeads.includes(id)) {
      setLeads(prev => prev.map(lead => 
        lead.id === id ? { ...lead, selected: false } : lead
      ));
      setSelectedLeads(prev => prev.filter(leadId => leadId !== id));
      return;
    }

    // Sinon, on le sélectionne
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, selected: true } : lead
    ));
    setSelectedLeads(prev => [...prev, id]);
  };

  // Gérer la suppression d'un lead et son remplacement
  useEffect(() => {
    setPrevLeads(leads);
  }, [leads]);

  const handleRemoveLead = async (id: string) => {
    try {
      setRemovedLeads(prev => [...prev, id]);
      // Cherche le prochain lead disponible dans les leads filtrés
      const nextLead = filteredLeads.find(l => 
        !leads.some(lead => lead.id === l.id) && 
        !removedLeads.includes(l.id) && 
        !selectedLeads.includes(l.id) &&
        l.selection_status !== 'rejected'
      );
      setLeads(prev => {
        const newLeads = prev.filter(l => l.id !== id);
        if (nextLead) {
          newLeads.push(nextLead);
        }
        return newLeads;
      });
      if (selectedLeads.includes(id)) {
        setSelectedLeads(prev => prev.filter(leadId => leadId !== id));
      }
      await refreshLeads();
    } catch (error) {
      console.error('Erreur lors du rejet du lead:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors du rejet du lead.",
        variant: "destructive",
      });
    }
  };

  const handleUnselectLead = (id: string) => {
    setSelectedLeads(selectedLeads.filter(lid => lid !== id));
  };

  const handleLaunchSearch = async () => {
    setSearchLaunched(false); // force reset
    setTimeout(async () => {
      setCards([null, null, null, null, null, null]);
      setValidatedCards([]);
      setNextLeadIndex(0);
      await refreshLeads();
      setSearchLaunched(true);
    }, 50);
  };

  // Initialiser les messages pré-rédigés
  useEffect(() => {
    if (selectedLeads.length > 0) {
      const initialMessages = selectedLeads.reduce((acc, leadId) => {
        const lead = leads.find(l => l.id === leadId);
        acc[leadId] = lead?.approach_message || '';
        return acc;
      }, {});
      setMessages(initialMessages);
    }
  }, [selectedLeads, leads]);

  useEffect(() => {
    if (searchLaunched && leads.length > 0) {
      // Timeout to ensure DOM is updated before firing resize
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
  }, [searchLaunched, leads]);

  // Prospection : n'envoie que les leads validés
  const handleStartProspecting = async () => {
    const validatedLeads = validatedCards.map(idx => cards[idx]).filter(Boolean);

    // Mettre à jour la liste des leads sélectionnés
    setSelectedLeads(validatedLeads.map(lead => lead.id));

    // Initialiser les messages pour les leads validés
    const initialMessages = validatedLeads.reduce((acc, lead) => {
      const leadId = leads.find(l => l.id === lead.id)?.id;
      acc[leadId || ''] = lead?.approach_message || '';
      return acc;
    }, {});
    setMessages(initialMessages);

    // Mettre à jour en base les leads validés (acceptés)
    const now = new Date().toISOString();
    for (const lead of validatedLeads) {
      await supabase
        .from('leads')
        .update({
          selection_status: 'accepted',
          accepted_at: now,
          accepted_by_user: user?.id,
          selected_by_user_id: null,
          selected_at: null,
          last_updated_at: now
        })
        .eq('id', lead.id);
    }

    // Libérer les leads non traités
    const unprocessedLeads = leads
      .filter(lead => !lead.selected && !removedLeads.includes(lead.id))
      .map(lead => lead.id);

    if (unprocessedLeads.length > 0) {
      // Mettre à jour la liste des leads en retirant les leads non traités
      setLeads(leads.filter(lead => lead.selected || removedLeads.includes(lead.id)));
    }

    setShowProspectingView(true);
  };

  const generateUniqueId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSendMessages = async () => {
    if (!unipileAccountId) {
      toast({
        title: "Compte LinkedIn non connecté",
        description: "Veuillez connecter votre compte LinkedIn avant d'envoyer des messages.",
        variant: "destructive",
      });
      return;
    }

    if (selectedLeads.length === 0) {
      toast({
        title: "Aucun lead sélectionné",
        description: "Veuillez sélectionner au moins un lead avant d'envoyer des messages.",
        variant: "destructive",
      });
      return;
    }

    const missingMessages = selectedLeads.filter(id => !messages[id]);
    if (missingMessages.length > 0) {
      toast({
        title: "Messages manquants",
        description: `${missingMessages.length} lead(s) n'ont pas de message personnalisé.`,
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const bulkRequestId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const messagesToSend = selectedLeads.map(leadId => {
        const lead = leads.find(l => l.id === leadId);
        return {
          id: generateUniqueId(),
          personaId: lead.author_profile_id,
          personaName: lead.author_name,
          personaTitle: lead.author_title,
          personaCompany: lead.author_company,
          personaProfileUrl: lead.author_profile_url,
          jobTitle: lead.job_title || 'LinkedIn Post',
          jobCompany: lead.company_name || lead.author_company || '',
          jobId: 'linkedin_post',
          message: messages[leadId],
          bulkRequestId: bulkRequestId
        };
      });

      const n8nUrl = 'https://n8n.getpro.co/webhook/819ed607-c468-4a53-a98c-817b8f3fc75d';
      
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bulkRequestId: bulkRequestId,
          unipileAccountId: unipileAccountId,
          messages: messagesToSend,
          timestamp: new Date().toISOString(),
          totalMessages: messagesToSend.length,
          source: 'linkedin_post'
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      toast({
        title: "Messages envoyés avec succès",
        description: `${messagesToSend.length} messages ont été envoyés vers le système de traitement.`,
      });
      
      // Après l'envoi, enregistrer une activité pour chaque message envoyé
      const performedAt = new Date().toISOString();
      for (const leadId of selectedLeads) {
        await supabase
          .from('activities')
          .insert({
            lead_id: leadId,
            activity_type: 'linkedin_message',
            activity_data: { bulkRequestId },
            performed_by_user_id: user?.id,
            performed_by_user_name: user?.user_metadata?.full_name || user?.email || 'Utilisateur inconnu',
            performed_at: performedAt
          });
        // Mettre à jour le lead comme contacté
        await supabase
          .from('leads')
          .update({
            last_contact_at: performedAt,
            linkedin_message_sent_at: performedAt,
            last_updated_at: performedAt
          })
          .eq('id', leadId);
      }

      // Mettre à jour la table user_stats pour l'utilisateur courant
      const today = new Date().toISOString().split('T')[0];
      const { data: existingStats, error: statsError } = await supabase
        .from('user_stats')
        .select('id, linkedin_messages_sent')
        .eq('user_id', user?.id)
        .eq('stat_date', today)
        .maybeSingle();
      if (statsError) {
        console.error('Erreur lors de la récupération de user_stats:', statsError);
      }
      if (existingStats && existingStats.id) {
        // Incrémenter le compteur existant
        await supabase
          .from('user_stats')
          .update({
            linkedin_messages_sent: (existingStats.linkedin_messages_sent || 0) + selectedLeads.length
          })
          .eq('id', existingStats.id);
      } else {
        // Créer une nouvelle ligne
        await supabase
          .from('user_stats')
          .insert({
            user_id: user?.id,
            stat_date: today,
            linkedin_messages_sent: selectedLeads.length
          });
      }

      // Réinitialiser la vue et relancer une recherche
      setShowProspectingView(false);
      setSelectedLeads([]);
      setRemovedLeads([]);
      setMessages({});
      // Relancer la recherche avec les mêmes filtres mais forcer un nouveau tirage de leads
      setSelectedContactFilter('exclude_2weeks');
      setTimeout(() => {
        // On force un "refresh" en naviguant vers la même page avec un paramètre unique
        navigate(`/lead-selection?refresh=${Date.now()}`);
      }, 200);
      toast({
        title: "Messages envoyés avec succès",
        description: "Une nouvelle recherche a été lancée avec vos filtres.",
      });

    } catch (error) {
      console.error('Erreur lors de l\'envoi vers N8N:', error);
      toast({
        title: "Erreur d'envoi",
        description: error.message || "Une erreur est survenue lors de l'envoi des messages. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRetrieveAllPhones = async () => {
    setIsRetrievingAllPhones(true);
    try {
      const leadsWithoutPhone = selectedLeads
        .map(leadId => leads.find(l => l.id === leadId))
        .filter(lead => lead && !lead.phone_number);

      for (const lead of leadsWithoutPhone) {
        const phoneNumber = await retrievePhone(lead.id);
        if (phoneNumber) {
          setLeads(prev => prev.map(l => 
            l.id === lead.id ? { ...l, phone_number: phoneNumber } : l
          ));
        }
        // Petite pause entre chaque requête pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "Récupération terminée",
        description: `${leadsWithoutPhone.length} numéro(s) de téléphone récupéré(s)`,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des numéros:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la récupération des numéros",
        variant: "destructive",
      });
    } finally {
      setIsRetrievingAllPhones(false);
    }
  };

  // Supprimer l'effet de libération manuelle des leads
  // useEffect(() => {
  //   const handleBeforeUnload = async () => {
  //     try {
  //       const { data: { session } } = await supabase.auth.getSession();
  //       if (!session?.access_token) return;

  //       // Appeler l'Edge Function pour libérer les leads
  //       await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/release-leads`, {
  //         method: 'POST',
  //         headers: {
  //           'Authorization': `Bearer ${session.access_token}`,
  //         },
  //       });
  //     } catch (error) {
  //       console.error('Erreur lors de la libération des leads:', error);
  //     }
  //   };

  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //     handleBeforeUnload();
  //   };
  // }, []);

  // Remplacer la gestion des cartes par :
  // Initialiser la première carte
  useEffect(() => {
    if (searchLaunched && filteredLeads.length > 0 && !cards[0]) {
      setCards([filteredLeads[0], null, null, null, null, null]);
      setValidatedCards([false, false, false, false, false, false]);
      setNextLeadIndex(1);
    }
  }, [searchLaunched, filteredLeads]);

  // Valider ou unvalider une carte
  const handleValidate = (idx: number) => {
    setValidatedCards(prev => {
      const newVal = [...prev];
      newVal[idx] = !newVal[idx];
      return newVal;
    });
    // Si on valide et qu'il reste de la place, ajouter une nouvelle carte à droite
    if (!validatedCards[idx] && nextLeadIndex < filteredLeads.length && cards.findIndex(c => c === null) !== -1) {
      const insertIdx = cards.findIndex(c => c === null);
      setCards(prev => {
        const newCards = [...prev];
        newCards[insertIdx] = filteredLeads[nextLeadIndex];
        return newCards;
      });
      setValidatedCards(prev => {
        const newVal = [...prev];
        newVal[insertIdx] = false;
        return newVal;
      });
      setNextLeadIndex(nextLeadIndex + 1);
    }
  };

  // Rejeter une carte
  const handleReject = (idx: number) => {
    if (nextLeadIndex < filteredLeads.length) {
      setCards(prev => {
        const newCards = [...prev];
        newCards[idx] = filteredLeads[nextLeadIndex];
        return newCards;
      });
      setValidatedCards(prev => {
        const newVal = [...prev];
        newVal[idx] = false;
        return newVal;
      });
      setNextLeadIndex(nextLeadIndex + 1);
    } else {
      setCards(prev => {
        const newCards = [...prev];
        newCards[idx] = null;
        return newCards;
      });
      setValidatedCards(prev => {
        const newVal = [...prev];
        newVal[idx] = false;
        return newVal;
      });
    }
  };

  return (
    <div style={{ fontFamily: DESIGN.typography.fontFamily, background: DESIGN.colors.background }} className="min-h-screen flex flex-col">
      {/* Header + Filtres */}
      <div className="px-8 pt-6 flex-none">
        <div className="flex items-center gap-3 mb-3">
          <CustomSidebarTrigger />
          <h1 className="text-2xl font-bold text-primary">Sélection de leads</h1>
        </div>
        <div className="flex flex-nowrap items-center gap-2 py-2 px-2 w-full overflow-x-auto border-b border-gray-100 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          <div className="flex flex-nowrap items-center gap-2 min-w-fit">
          <MultiSelectFilter
            title="Période"
            options={dateFilterOptions}
            selectedValues={[selectedDateFilter]}
            onSelectionChange={vals => setSelectedDateFilter(vals[0] || '7days')}
            singleSelect
            highlightActive={selectedDateFilter !== '7days'}
            hideChevron
          />
          <MultiSelectFilter
            title="Statut de contact"
            options={contactFilterOptions}
            selectedValues={[selectedContactFilter]}
            onSelectionChange={vals => setSelectedContactFilter(vals[0] || 'exclude_2weeks')}
            singleSelect
            highlightActive={selectedContactFilter !== 'exclude_2weeks'}
            hideChevron
          />
          <MultiSelectFilter
            title="Exclure secteurs"
            options={availableCompanyCategories.map(cat => ({ value: cat, label: cat }))}
            selectedValues={selectedCompanyCategories}
            onSelectionChange={setSelectedCompanyCategories}
            highlightActive={selectedCompanyCategories.length > 0}
            hideChevron
          />
          <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 text-xs whitespace-nowrap">Employés:</span>
            <Input
              type="number"
              placeholder="Min"
              value={minEmployees}
              onChange={e => setMinEmployees(e.target.value)}
              className="h-8 w-16 text-xs bg-gray-100 border-0 focus:ring-0 text-center"
              min="0"
            />
            <span className="text-xs text-gray-400">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxEmployees}
              onChange={e => setMaxEmployees(e.target.value)}
              className="h-8 w-16 text-xs bg-gray-100 border-0 focus:ring-0 text-center"
              min="0"
            />
          </div>
            <div className="flex items-center gap-2 min-w-fit">
            {availableCategories.map(cat => (
              <Badge
                key={cat}
                  className={`cursor-pointer px-3 py-1 border whitespace-nowrap ${categoryColors[cat]} ${selectedCategories.includes(cat) ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                onClick={() => setSelectedCategories(selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat])}
              >
                {cat}
              </Badge>
            ))}
          </div>
            <Button className="ml-2 px-3 py-1 text-sm font-medium bg-primary text-white rounded-lg shadow-sm whitespace-nowrap" size="sm" onClick={handleLaunchSearch}>Start</Button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {searchLaunched && !showProspectingView && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="flex-1 min-h-0 flex justify-center"
            >
              <div className="w-full max-w-[1600px] px-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4 mx-auto">
                  {cards.map((lead, idx) => (
                    <div key={lead?.id || idx} className="flex flex-col h-[420px] w-full">
                      {lead && (
                        <LeadSelectionCard
                          lead={lead}
                          isMobile={false}
                          onAccept={handleValidate}
                          onReject={handleReject}
                          validated={validatedCards[idx]}
                          idx={idx}
                          onClick={() => {}}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {showProspectingView && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full min-h-[calc(100vh-100px)] bg-slate-50 py-8"
            >
              <div className="max-w-[1000px] mx-auto px-6"> {/* Réduit de 1200px à 1000px */}
                {/* En-tête */}
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Messages personnalisés</h2>
                    <p className="text-slate-600 mt-1">Personnalisez vos messages pour {selectedLeads.length} leads sélectionnés</p>
                  </div>
                  <Button
                    onClick={handleRetrieveAllPhones}
                    disabled={isRetrievingAllPhones}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-green-600 bg-green-50 hover:bg-green-100 transition-colors shadow-sm"
                  >
                    {isRetrievingAllPhones ? (
                      <>
                        <Loader2 className="w-4 h-4 text-green-700 animate-spin" />
                        <span className="text-green-700 font-medium">Récupération en cours...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 text-green-700" />
                        <span className="text-green-700 font-medium">Récupérer tous les numéros</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Liste des leads */}
                <div className="space-y-8">
                  {selectedLeads.map((leadId, index) => {
                    const lead = leads.find(l => l.id === leadId);
                    if (!lead) return null;

                    return (
                      <motion.div
                        key={lead.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-6 h-[400px]"
                      >
                        {/* Carte du lead */}
                        <div className="w-[500px] h-[400px] bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200 flex flex-col">
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-900">
                                {lead.first_name} {lead.last_name}
                              </h3>
                              {lead.author_profile_url && (
                                <a
                                  href={lead.author_profile_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                                  </svg>
                                </a>
                              )}
                            </div>
                            {lead.phone_number ? (
                              <div className="px-3 py-1.5 rounded-lg border-2 border-green-600 bg-green-50 text-green-700 font-medium text-sm shadow-sm">
                                {lead.phone_number}
                              </div>
                            ) : (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const phoneNumber = await retrievePhone(lead.id);
                                  if (phoneNumber) {
                                    setLeads(prev => prev.map(l =>
                                      l.id === lead.id ? { ...l, phone_number: phoneNumber } : l
                                    ));
                                  }
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-green-600 bg-green-50 hover:bg-green-100 transition-colors shadow-sm"
                              >
                                <span className="text-green-700 text-sm font-medium whitespace-nowrap">Récupérer</span>
                                <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2A19.72 19.72 0 0 1 3.08 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.13 1.05.37 2.07.73 3.06a2 2 0 0 1-.45 2.11L9.91 11.09a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.11-.45c.99.36 2.01.6 3.06.73A2 2 0 0 1 22 16.92z"/></svg>
                              </button>
                            )}
                          </div>

                          {/* Informations de l'entreprise avec HoverCard */}
                          <CompanyHoverCard
                            companyId={lead.company_id}
                            companyLinkedInId={lead.company_linkedin_id}
                            companyName={lead.company_name || ''}
                            showLogo={true}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-slate-900 truncate">{lead.company_name}</h3>
                                <p className="text-sm text-slate-600 truncate">{lead.company_position}</p>
                              </div>
                            </div>
                          </CompanyHoverCard>

                          {/* Texte du post LinkedIn */}
                          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
                            <div className="prose prose-slate prose-sm max-w-none">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({node, ...props}) => <p className="whitespace-pre-wrap mb-2 pr-0.5 last:pr-0" {...props} />, 
                                  a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} target="_blank" rel="noopener noreferrer" />, 
                                  ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 pr-0.5" {...props} />, 
                                  ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 pr-0.5" {...props} />, 
                                  li: ({node, ...props}) => <li className="mb-1 pr-0.5 last:pr-0" {...props} />, 
                                  strong: ({node, ...props}) => <strong className="font-semibold" {...props} />, 
                                  em: ({node, ...props}) => <em className="italic" {...props} />, 
                                  br: ({node, ...props}) => <br className="mb-2" {...props} />, 
                                }}
                              >
                                {lead.text || ''}
                              </ReactMarkdown>
                            </div>
                            {lead.url && (
                              <div className="flex justify-end mt-2">
                                <a
                                  href={lead.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 group shadow-md"
                                  style={{zIndex: 20, background: 'linear-gradient(90deg, #f0f6ff 60%, #e0e7ef 100%)'}}
                                >
                                  <span>Voir sur LinkedIn</span>
                                  <svg 
                                    width="12" 
                                    height="12" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                                  >
                                    <path d="M7 17L17 7"/>
                                    <path d="M7 7h10v10"/>
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Zone de message */}
                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                          <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                              <h3 className="text-lg font-semibold text-slate-900">Message personnalisé</h3>
                              <span className="text-sm text-slate-500">{messages[leadId]?.length || 0} caractères</span>
                            </div>
                            <textarea
                              className="flex-1 w-full p-4 rounded-lg border border-slate-200 resize-none bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow duration-200"
                              value={messages[leadId] || ''}
                              onChange={(e) => setMessages(prev => ({ ...prev, [leadId]: e.target.value }))}
                              placeholder="Écrivez votre message personnalisé ici..."
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer : bouton continuer */}
      {searchLaunched && !showProspectingView && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 px-8 py-4 bg-gradient-to-t from-white via-white to-white/80 backdrop-blur-sm border-t border-gray-100 z-50"
        >
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="text-gray-600 text-sm font-normal pr-8 italic">
              Sélectionnez les leads pertinents avec <span className='font-bold text-blue-600'>✓</span>, rejetez ceux à exclure avec la croix, puis cliquez sur <span className='font-bold text-primary'>Prospecter</span> pour passer à l'étape suivante.
            </div>
            <div className="flex items-center gap-4">
              <Button
                className="bg-white hover:bg-gray-50 text-primary border-2 border-primary px-6 py-6 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleStartProspecting}
                disabled={validatedCards.filter(Boolean).length === 0}
              >
                <span>Prospecter {validatedCards.filter(Boolean).length} leads</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {showProspectingView && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...DESIGN.layout.footer, display: 'flex', justifyContent: 'space-between', background: DESIGN.colors.background }}
        >
          <Button 
            variant="outline" 
            onClick={() => setShowProspectingView(false)}
          >
            Retour à la sélection
          </Button>
          <Button 
            style={DESIGN.buttons.primary}
            onClick={handleSendMessages}
            disabled={selectedLeads.length === 0 || isSending || !unipileAccountId}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                Envoyer les messages ({Object.values(messages).filter(msg => msg && msg.trim().length > 0).length})
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
} 