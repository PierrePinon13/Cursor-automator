import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, X, Check } from 'lucide-react';
import MultiSelectFilter from '@/components/leads/MultiSelectFilter';
import { Input } from '@/components/ui/input';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import { useLeads } from '@/hooks/useLeads';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LeadCard } from '@/components/leads/LeadCard';
import CompanyHoverCard from '@/components/leads/CompanyHoverCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

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

  // Simule le remplacement d'un lead retiré par un nouveau
  const handleRemoveLead = (id: string) => {
    setRemovedLeads(prev => [...prev, id]);
    setLeads(prev => {
      const remaining = prev.filter(l => l.id !== id);
      // Cherche le prochain lead filtré qui n'est pas déjà affiché ni supprimé ni sélectionné
      const nextLead = filteredLeads.find(l =>
        !remaining.some(lead => lead.id === l.id) &&
        !removedLeads.includes(l.id) &&
        !selectedLeads.includes(l.id)
      );
      return nextLead ? [...remaining, nextLead] : remaining;
    });
  };

  const handleSelectLead = (id: string) => {
    setSelectedLeads([...selectedLeads, id]);
  };

  const handleUnselectLead = (id: string) => {
    setSelectedLeads(selectedLeads.filter(lid => lid !== id));
  };

  const handleLaunchSearch = () => {
    setSearchLaunched(true);
    setRemovedLeads([]);
    setSelectedLeads([]);
    // Prend les 6 premiers leads filtrés non supprimés
    setLeads(filteredLeads.slice(0, 6));
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
    setShowProspectingView(true);
  };

  return (
    <div style={{ fontFamily: DESIGN.typography.fontFamily, background: DESIGN.colors.background }} className="min-h-screen">
      {/* Header + Filtres */}
      <div className="px-8 pt-8 pb-4 min-w-0 min-h-0">
        <div className="flex items-center gap-3 mb-4">
          <CustomSidebarTrigger />
          <h1 className="text-2xl font-bold text-primary">Sélection de leads</h1>
        </div>
        <Card className="mb-4 shadow-md">
          <CardContent className="flex flex-wrap items-center gap-4 py-4 px-6">
            <MultiSelectFilter
              title="Période"
              options={dateFilterOptions}
              selectedValues={[selectedDateFilter]}
              onSelectionChange={vals => setSelectedDateFilter(vals[0] || '7days')}
              singleSelect
              highlightActive={selectedDateFilter !== '7days'}
            />
            <MultiSelectFilter
              title="Statut de contact"
              options={contactFilterOptions}
              selectedValues={[selectedContactFilter]}
              onSelectionChange={vals => setSelectedContactFilter(vals[0] || 'exclude_2weeks')}
              singleSelect
              highlightActive={selectedContactFilter !== 'exclude_2weeks'}
            />
            <MultiSelectFilter
              title="Exclure secteurs"
              options={availableCompanyCategories.map(cat => ({ value: cat, label: cat }))}
              selectedValues={selectedCompanyCategories}
              onSelectionChange={setSelectedCompanyCategories}
              highlightActive={selectedCompanyCategories.length > 0}
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
            <Button className="ml-auto" onClick={handleLaunchSearch}>
              Lancer la recherche
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {searchLaunched && !showProspectingView && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="w-full flex justify-center py-8 px-4"
            >
              <div className="w-full max-w-[1600px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 place-items-center">
                  {leads.map(lead => (
                    <div key={lead.id} className="relative flex flex-col items-center w-full">
                      <LeadCard 
                        lead={lead} 
                        isMobile={false} 
                        onClick={() => {}} // Pas d'action sur clic pour la sélection
                      />
                      {/* Boutons oui/non en position absolue */}
                      <div className="flex items-center justify-center gap-6 mt-4">
                        <button
                          className="w-10 h-10 rounded-full bg-gray-100/60 border border-gray-300 flex items-center justify-center text-lg text-gray-500 hover:bg-red-100 hover:text-red-600 transition shadow-lg"
                          onClick={() => setLeads(prev => prev.filter(l => l.id !== lead.id))}
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <button
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition shadow-lg ${
                            selectedLeads.includes(lead.id)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white/60 text-primary border-primary hover:bg-primary/10'
                          }`}
                          onClick={() => selectedLeads.includes(lead.id) ? handleUnselectLead(lead.id) : handleSelectLead(lead.id)}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                      </div>
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
                            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-slate-100">
                              {lead.company_logo ? (
                                <img
                                  src={lead.company_logo}
                                  alt={`${lead.company_name} logo`}
                                  className="w-16 h-16 rounded-lg object-contain bg-white p-1 border border-slate-100"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12V8H6a2 2 0 00-2 2v12a2 2 0 002 2h12v-4" />
                                  </svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-semibold text-slate-900 truncate">{lead.first_name}</h3>
                                <p className="text-slate-600 truncate mt-1">{lead.company_position}</p>
                                <p className="text-sm text-slate-500 truncate">{lead.company_name}</p>
                              </div>
                            </div>
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
                              <span className="text-sm text-slate-500">{messages[lead.id]?.length || 0} caractères</span>
                            </div>
                            <textarea
                              className="flex-1 w-full p-4 rounded-lg border border-slate-200 resize-none bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow duration-200"
                              value={messages[lead.id] || ''}
                              onChange={(e) => setMessages(prev => ({ ...prev, [lead.id]: e.target.value }))}
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
      {searchLaunched && selectedLeads.length >= 3 && !showProspectingView && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...DESIGN.layout.footer, display: 'flex', justifyContent: 'flex-end', background: DESIGN.colors.background }}
        >
          <Button 
            style={DESIGN.buttons.primary}
            onClick={handleStartProspecting}
          >
            Passer à la prospection ({selectedLeads.length} sélectionné{selectedLeads.length > 1 ? 's' : ''})
          </Button>
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
          <Button style={DESIGN.buttons.primary}>
            Envoyer les messages ({selectedLeads.length})
          </Button>
        </motion.div>
      )}
    </div>
  );
} 