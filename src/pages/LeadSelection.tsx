import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
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
  const [isSending, setIsSending] = useState(false);
  const [filters, setFilters] = useState(MOCK_FILTERS);
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
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [removedLeads, setRemovedLeads] = useState<string[]>([]);
  const [searchLaunched, setSearchLaunched] = useState(false);
  const [showProspectingView, setShowProspectingView] = useState(false);
  const [messages, setMessages] = useState<{ [key: string]: string }>({});
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number>(0);

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
  const handleRemoveLead = async (id: string) => {
    try {
      // Marquer le lead comme rejeté dans la base de données
      const { error } = await supabase
        .from('leads')
        .update({ 
          processing_status: 'rejected_by_user',
          last_updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Erreur lors du rejet du lead:', error);
        toast({
          title: "Erreur",
          description: "Impossible de rejeter le lead. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // Ajouter le lead à la liste des leads rejetés
      setRemovedLeads(prev => [...prev, id]);
      
      // Cherche le prochain lead disponible dans les leads filtrés
      const nextLead = filteredLeads.find(l => 
        !leads.some(lead => lead.id === l.id) && 
        !removedLeads.includes(l.id) && 
        !selectedLeads.includes(l.id) &&
        l.processing_status !== 'rejected_by_user'
      );

      // Met à jour la liste des leads en retirant le lead rejeté
      setLeads(prev => {
        const remaining = prev.filter(l => l.id !== id);
        return nextLead ? [...remaining, nextLead] : remaining;
      });

      // Retirer le lead de la liste des leads sélectionnés s'il y était
      if (selectedLeads.includes(id)) {
        setSelectedLeads(prev => prev.filter(leadId => leadId !== id));
      }

      // Rafraîchir la liste des leads pour s'assurer que les leads rejetés sont exclus
      refreshLeads();

    } catch (error) {
      console.error('Erreur lors du rejet du lead:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du rejet du lead.",
        variant: "destructive",
      });
    }
  };

  const handleUnselectLead = (id: string) => {
    setSelectedLeads(selectedLeads.filter(lid => lid !== id));
  };

  const handleLaunchSearch = () => {
    setSearchLaunched(true);
    setRemovedLeads([]);
    setSelectedLeads([]);
    // Prend les 6 premiers leads filtrés non rejetés
    const availableLeads = filteredLeads.filter(lead => 
      lead.processing_status !== 'rejected_by_user' &&
      !removedLeads.includes(lead.id)
    );
    setLeads(availableLeads.slice(0, 6));
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

  const handleStartProspecting = () => {
    // Filtrer pour ne garder que les leads validés
    const validatedLeads = selectedLeads.filter(leadId => {
      const lead = leads.find(l => l.id === leadId);
      return lead && lead.selected;
    });

    // Mettre à jour la liste des leads sélectionnés
    setSelectedLeads(validatedLeads);

    // Initialiser les messages pour les leads validés
    const initialMessages = validatedLeads.reduce((acc, leadId) => {
      const lead = leads.find(l => l.id === leadId);
      acc[leadId] = lead?.approach_message || '';
      return acc;
    }, {});
    setMessages(initialMessages);

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
      
      // Reset selection and messages
      setSelectedLeads([]);
      setMessages({});
      setShowProspectingView(false);
      setSearchLaunched(true); // This will take us back to the lead selection view
      refreshLeads();

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

  return (
    <div style={{ fontFamily: DESIGN.typography.fontFamily, background: DESIGN.colors.background }} className="min-h-screen flex flex-col">
      {/* Header + Filtres */}
      <div className="px-8 pt-6 flex-none">
        <div className="flex items-center gap-3 mb-3">
          <CustomSidebarTrigger />
          <h1 className="text-2xl font-bold text-primary">Sélection de leads</h1>
        </div>
        <div className="flex flex-nowrap items-center gap-2 py-2 px-2 w-full overflow-x-auto border-b border-gray-100">
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
            <span className="font-medium text-gray-700 text-xs">Employés:</span>
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
          <div className="flex items-center gap-2 flex-wrap">
            {availableCategories.map(cat => (
              <Badge
                key={cat}
                className={`cursor-pointer px-3 py-1 border ${categoryColors[cat]} ${selectedCategories.includes(cat) ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                onClick={() => setSelectedCategories(selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat])}
              >
                {cat}
              </Badge>
            ))}
          </div>
          <div className="flex-1" />
          <Button className="ml-2 px-3 py-1 text-sm font-medium bg-primary text-white rounded-lg shadow-sm" size="sm" onClick={handleLaunchSearch}>Start</Button>
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
              className="flex-1 min-h-0"
            >
              <div className="w-full max-w-[1600px] px-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4">
                  {leads.map(lead => (
                    <div key={lead.id} className="flex flex-col h-[420px] w-full">
                      <LeadSelectionCard 
                        lead={lead} 
                        isMobile={false} 
                        onClick={() => {}} 
                        onAccept={() => handleSelectLead(lead.id)}
                        onReject={() => handleRemoveLead(lead.id)}
                      />
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
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-slate-900">Messages personnalisés</h2>
                  <p className="text-slate-600 mt-1">Personnalisez vos messages pour {selectedLeads.length} leads sélectionnés</p>
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
                        <div className="w-[500px] bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                          <div className="h-full flex flex-col">
                            {/* En-tête avec les informations du lead */}
                            <div className="flex flex-col gap-4 mb-4 pb-4 border-b border-slate-100">
                              {/* Nom du lead, titre et lien LinkedIn */}
                              <div className="flex flex-col gap-1">
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
                                <p className="text-slate-600 truncate">{lead.job_title}</p>
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
                            </div>

                            {/* Contenu du post LinkedIn */}
                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
                              <div className="prose prose-slate prose-sm max-w-none">
                                {lead.text}
                              </div>
                            </div>
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
      {searchLaunched && selectedLeads.length > 0 && !showProspectingView && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 px-8 py-4 bg-gradient-to-t from-white via-white to-white/80 backdrop-blur-sm border-t border-gray-100 z-50"
        >
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Leads sélectionnés</p>
                <p className="text-lg font-semibold text-gray-900">{selectedLeads.length} profils</p>
              </div>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white px-6 py-6 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleStartProspecting}
            >
              <span>Passer à la prospection</span>
              <motion.div
                initial={{ x: 0 }}
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </motion.div>
            </Button>
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