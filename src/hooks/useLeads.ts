
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface Lead {
  id: string;
  author_name: string;
  author_headline?: string;
  author_profile_url?: string;
  company_name?: string;
  company_position?: string;
  openai_step2_localisation?: string;
  openai_step3_categorie?: string;
  openai_step3_postes_selectionnes?: string[];
  posted_at_iso?: string;
  latest_post_date?: string;
  last_contact_at?: string;
  last_updated_at?: string;
  phone_number?: string;
  phone_contact_status?: string;
  linkedin_message_sent_at?: string;
  assigned_to_user_id?: string;
  assignment_completed_at?: string;
  processing_status?: string;
  is_client_lead?: boolean;
  matched_client_name?: string;
  locked_by_user_id?: string;
  locked_by_user_name?: string;
  locked_at?: string;
  title?: string;
  text?: string;
  url?: string;
  approach_message?: string;
  approach_message_generated?: boolean;
  client_history_alert?: string;
  matched_hr_provider_id?: string;
  matched_hr_provider_name?: string;
  contacted_by_user_id?: string;
  phone_contact_by_user_id?: string;
  // Nouveaux champs pour les infos de l'entreprise
  company_categorie?: string;
  company_employee_count?: string;
}

export const useLeads = () => {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('7days');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('exclude_2weeks');
  const [selectedCompanyCategories, setSelectedCompanyCategories] = useState<string[]>([]);
  const [minEmployees, setMinEmployees] = useState<string>('');
  const [maxEmployees, setMaxEmployees] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableCompanyCategories, setAvailableCompanyCategories] = useState<string[]>([]);
  const { isAdmin } = useUserRole();

  // Fonction pour récupérer les leads depuis la base de données avec join sur companies
  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching all leads from database with company info...');
      
      let query = supabase
        .from('leads')
        .select(`
          *,
          companies!leads_company_id_fkey (
            categorie,
            employee_count
          )
        `)
        .neq('processing_status', 'filtered_hr_provider')
        .neq('processing_status', 'mistargeted')
        .or('is_client_lead.is.null,is_client_lead.eq.false')
        .is('matched_client_id', null)
        .is('matched_client_name', null)
        .order('latest_post_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching leads:', error);
        return;
      }

      if (data) {
        // Transformer les données pour inclure les infos de l'entreprise
        const leadsWithCompanyInfo = data.map(lead => ({
          ...lead,
          company_categorie: lead.companies?.categorie || null,
          company_employee_count: lead.companies?.employee_count || null
        }));

        console.log(`✅ Fetched ${leadsWithCompanyInfo.length} leads from database (client leads excluded)`);
        setAllLeads(leadsWithCompanyInfo);
        
        // Extraire les catégories uniques pour les filtres
        const categories = [...new Set(data
          .map(lead => lead.openai_step3_categorie)
          .filter(Boolean)
        )];
        setAvailableCategories(categories);

        // Extraire les catégories d'entreprise uniques
        const companyCategories = [...new Set(data
          .map(lead => lead.companies?.categorie)
          .filter(Boolean)
        )];
        setAvailableCompanyCategories(companyCategories);
        
        console.log('📋 Available categories:', categories);
        console.log('🏢 Available company categories:', companyCategories);
      }
    } catch (error) {
      console.error('❌ Error in fetchLeads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour appliquer le filtre de date
  const applyDateFilter = (leads: Lead[], dateFilter: string): Lead[] => {
    if (dateFilter === 'all') return leads;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return leads.filter(lead => {
      const postDate = lead.latest_post_date || lead.posted_at_iso;
      if (!postDate) {
        console.log('🚫 Lead without date:', lead.id, lead.author_name);
        return false;
      }
      
      const leadDate = new Date(postDate);
      const timeDiff = now.getTime() - leadDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      switch (dateFilter) {
        case '24h':
          const result = hoursDiff <= 24;
          if (!result) {
            console.log(`⏰ Lead filtered out (24h): ${lead.author_name}, posted ${Math.round(hoursDiff)}h ago`);
          }
          return result;
        case '48h':
          return hoursDiff <= 48;
        case '7days':
          return daysDiff <= 7;
        default:
          return true;
      }
    });
  };

  // Fonction pour appliquer le filtre de contact
  const applyContactFilter = (leads: Lead[], contactFilter: string): Lead[] => {
    if (contactFilter === 'exclude_none') return leads;

    const now = new Date();
    
    return leads.filter(lead => {
      // Vérifier tous les types de contact
      const hasLinkedInMessage = !!lead.linkedin_message_sent_at;
      const hasPhoneContact = !!lead.phone_contact_status;
      const hasLastContact = !!lead.last_contact_at;
      
      // Si aucun contact, le lead passe tous les filtres
      if (!hasLinkedInMessage && !hasPhoneContact && !hasLastContact) {
        return true;
      }

      // Trouver la date de contact la plus récente
      let lastContactDate: Date | null = null;
      
      if (lead.linkedin_message_sent_at) {
        const linkedInDate = new Date(lead.linkedin_message_sent_at);
        if (!lastContactDate || linkedInDate > lastContactDate) {
          lastContactDate = linkedInDate;
        }
      }
      
      if (lead.last_contact_at) {
        const contactDate = new Date(lead.last_contact_at);
        if (!lastContactDate || contactDate > lastContactDate) {
          lastContactDate = contactDate;
        }
      }

      if (!lastContactDate) return true;

      const daysSinceContact = (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24);

      switch (contactFilter) {
        case 'exclude_1week':
          const result1w = daysSinceContact > 7;
          if (!result1w) {
            console.log(`📞 Lead filtered out (1 week): ${lead.author_name}, contacted ${Math.round(daysSinceContact)} days ago`);
          }
          return result1w;
        case 'exclude_2weeks':
          return daysSinceContact > 14;
        case 'exclude_1month':
          return daysSinceContact > 30;
        case 'exclude_all_contacted':
          const resultAll = !hasLinkedInMessage && !hasPhoneContact && !hasLastContact;
          if (!resultAll) {
            console.log(`📞 Lead filtered out (all contacted): ${lead.author_name}, has contact`);
          }
          return resultAll;
        default:
          return true;
      }
    });
  };

  // Fonction pour appliquer tous les filtres
  const applyAllFilters = () => {
    console.log('🎯 Starting filter application...');
    console.log('📊 Total leads to filter:', allLeads.length);
    console.log('🏷️ Selected categories:', selectedCategories);
    console.log('🏢 Company categories to EXCLUDE:', selectedCompanyCategories);
    console.log('👥 Employee range:', minEmployees, '-', maxEmployees);
    console.log('📅 Date filter:', selectedDateFilter);
    console.log('📞 Contact filter:', selectedContactFilter);

    let result = [...allLeads];
    const initialCount = result.length;

    // Filtre par catégorie de lead
    if (selectedCategories.length > 0) {
      const beforeCategory = result.length;
      result = result.filter(lead => {
        const category = lead.openai_step3_categorie || '';
        return selectedCategories.includes(category);
      });
      console.log(`🏷️ After lead category filter: ${beforeCategory} -> ${result.length} leads`);
    }

    // Filtre d'exclusion par catégorie d'entreprise
    if (selectedCompanyCategories.length > 0) {
      const beforeCompanyCategory = result.length;
      result = result.filter(lead => {
        const companyCategory = lead.company_categorie || '';
        const shouldExclude = selectedCompanyCategories.includes(companyCategory);
        
        if (shouldExclude) {
          console.log(`🚫 EXCLUDING lead: ${lead.author_name} from ${lead.company_name} - Category: "${companyCategory}"`);
          return false;
        }
        return true;
      });
      console.log(`🏢 After company category exclusion filter: ${beforeCompanyCategory} -> ${result.length} leads`);
    }

    // Filtre par nombre d'employés
    if (minEmployees || maxEmployees) {
      const beforeEmployees = result.length;
      result = result.filter(lead => {
        const employeeCount = lead.company_employee_count;
        if (!employeeCount) return false;
        
        // Extraire le nombre de la chaîne (ex: "50-100" -> prendre 75 comme moyenne)
        const extractNumber = (str: string): number => {
          const match = str.match(/(\d+)(?:-(\d+))?/);
          if (!match) return 0;
          if (match[2]) {
            // Range format like "50-100"
            return (parseInt(match[1]) + parseInt(match[2])) / 2;
          }
          return parseInt(match[1]);
        };

        const employeeNumber = extractNumber(employeeCount);
        const min = minEmployees ? parseInt(minEmployees) : 0;
        const max = maxEmployees ? parseInt(maxEmployees) : Infinity;
        
        return employeeNumber >= min && employeeNumber <= max;
      });
      console.log(`👥 After employee count filter (${minEmployees}-${maxEmployees}): ${beforeEmployees} -> ${result.length} leads`);
    }

    // Filtre par date
    const beforeDate = result.length;
    result = applyDateFilter(result, selectedDateFilter);
    console.log(`📅 After date filter (${selectedDateFilter}): ${beforeDate} -> ${result.length} leads`);

    // Filtre par statut de contact
    const beforeContact = result.length;
    result = applyContactFilter(result, selectedContactFilter);
    console.log(`📞 After contact filter (${selectedContactFilter}): ${beforeContact} -> ${result.length} leads`);

    console.log(`✅ Final filtered result: ${result.length} leads (from ${initialCount} total)`);
    setFilteredLeads(result);
  };

  const refreshLeads = () => {
    console.log('🔄 Refreshing leads...');
    fetchLeads();
  };

  // Effet pour charger les leads au démarrage
  useEffect(() => {
    console.log('🚀 Initial load of leads');
    fetchLeads();
  }, []);

  // Effet pour appliquer les filtres quand les données ou les filtres changent
  useEffect(() => {
    if (allLeads.length > 0) {
      console.log('🔄 Applying filters due to data or filter change');
      applyAllFilters();
    }
  }, [allLeads, selectedCategories, selectedCompanyCategories, minEmployees, maxEmployees, selectedDateFilter, selectedContactFilter]);

  return {
    leads: allLeads,
    filteredLeads,
    loading,
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
    refreshLeads
  };
};
