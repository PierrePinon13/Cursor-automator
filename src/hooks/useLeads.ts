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
  posted_at_timestamp?: number;
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
  company_categorie?: string;
  company_employee_count?: string;
  company_1_linkedin_id?: string;
  unipile_company_linkedin_id?: string;
  company_logo_url?: string;
  company_sector?: string;
  companies?: {
    id: string;
    name: string;
    description: string;
    industry: string;
    activities: string;
    employee_count: string;
    logo: string;
    categorie: string;
    headquarters: string;
    website: string;
  };
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
  const { isAdmin } = useUserRole();

  // Liste statique des catégories de métier
  const availableCategories = [
    'Tech',
    'Business',
    'Product',
    'Executive Search',
    'Comptelio',
    'RH',
    'Freelance',
    'Data'
  ];

  // Liste statique des catégories d'entreprise
  const availableCompanyCategories = [
    'esn',
    'cabinet de recrutement',
    'editeur de logiciel',
    'autre'
  ];

  // Fonction pour récupérer les leads depuis la base de données avec join sur companies
  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching all leads from database with company info...');
      
      // First, get leads with their direct company association
      let query = supabase
        .from('leads')
        .select(`
          *,
          companies!leads_company_id_fkey (
            id,
            name,
            description,
            industry,
            activities,
            employee_count,
            logo,
            categorie,
            headquarters,
            website
          )
        `)
        .neq('processing_status', 'filtered_hr_provider')
        .neq('processing_status', 'mistargeted')
        .or('is_client_lead.is.null,is_client_lead.eq.false')
        .is('matched_client_id', null)
        .is('matched_client_name', null)
        .order('latest_post_date', { ascending: false });

      console.log('🔍 Fetching leads with query:', query);

      const { data: leadsWithDirectCompany, error } = await query;

      if (error) {
        console.error('❌ Error fetching leads:', error);
        return;
      }

      if (!leadsWithDirectCompany) {
        setAllLeads([]);
        return;
      }

      // For leads without direct company_id, try to find company via linkedin_id
      const leadsNeedingCompanyInfo = leadsWithDirectCompany.filter(lead => 
        !lead.companies && (lead.company_1_linkedin_id || lead.unipile_company_linkedin_id)
      );

      let companiesByLinkedInId = {};
      if (leadsNeedingCompanyInfo.length > 0) {
        const linkedInIds = leadsNeedingCompanyInfo
          .map(lead => lead.company_1_linkedin_id || lead.unipile_company_linkedin_id)
          .filter(Boolean);

        if (linkedInIds.length > 0) {
          const { data: companiesData } = await supabase
            .from('companies')
            .select('linkedin_id, categorie, employee_count, industry')
            .in('linkedin_id', linkedInIds);

          if (companiesData) {
            companiesByLinkedInId = companiesData.reduce((acc, company) => {
              acc[company.linkedin_id] = company;
              return acc;
            }, {});
          }
        }
      }

      // Combine leads with their company information
      const leadsWithCompanyInfo = leadsWithDirectCompany.map(lead => {
        let companyInfo = lead.companies;
        
        // If no direct company association, try to find via linkedin_id
        if (!companyInfo) {
          const linkedInId = lead.company_1_linkedin_id || lead.unipile_company_linkedin_id;
          if (linkedInId && companiesByLinkedInId[linkedInId]) {
            companyInfo = companiesByLinkedInId[linkedInId];
          }
        }

        return {
          ...lead,
          company_categorie: companyInfo?.categorie || null,
          company_employee_count: companyInfo?.employee_count || null,
          company_logo_url: companyInfo?.logo || null,
          company_sector: companyInfo?.industry || null
        };
      });

      console.log(`✅ Fetched ${leadsWithCompanyInfo.length} leads from database`);
      setAllLeads(leadsWithCompanyInfo);
      
    } catch (error) {
      console.error('❌ Error in fetchLeads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour appliquer tous les filtres
  const applyAllFilters = () => {
    console.log('🔄 Starting filter application on', allLeads.length, 'leads');
    let filtered = [...allLeads];

    // Filtrer les leads rejetés
    filtered = filtered.filter(lead => lead.processing_status !== 'rejected_by_user');
    console.log('🚫 Leads after rejection filter:', filtered.length);

    // Appliquer le filtre de date
    if (selectedDateFilter !== 'all') {
    const now = new Date();
      const cutoffDate = new Date();
      
      switch (selectedDateFilter) {
        case '24h':
          cutoffDate.setHours(now.getHours() - 24);
          break;
        case '48h':
          cutoffDate.setHours(now.getHours() - 48);
          break;
        case '7days':
          cutoffDate.setDate(now.getDate() - 7);
          break;
      }

      filtered = filtered.filter(lead => {
        let leadDate: Date;
        if (lead.posted_at_timestamp) {
          leadDate = new Date(lead.posted_at_timestamp);
        } else if (lead.posted_at_iso) {
          leadDate = new Date(lead.posted_at_iso);
        } else if (lead.latest_post_date) {
          leadDate = new Date(lead.latest_post_date);
        } else {
          console.log('❌ Lead without date:', lead.id, lead.author_name);
          return false;
        }
        return leadDate >= cutoffDate;
      });
      console.log('📅 Leads after date filter:', filtered.length);
      }

    // Appliquer le filtre de contact
    if (selectedContactFilter !== 'exclude_none') {
      filtered = filtered.filter(lead => {
        const hasContact = lead.last_contact_at || lead.linkedin_message_sent_at || lead.phone_contact_status;
        
        if (!hasContact) {
          return true; // Garder les leads jamais contactés
      }
      
      if (lead.last_contact_at) {
        const contactDate = new Date(lead.last_contact_at);
          const diffDays = Math.ceil((new Date().getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));

          switch (selectedContactFilter) {
        case 'exclude_1week':
              return diffDays > 7;
        case 'exclude_2weeks':
              return diffDays > 14;
        case 'exclude_1month':
              return diffDays > 30;
        case 'exclude_all_contacted':
              return false;
        default:
          return true;
      }
        }

        return true;
      });
      console.log('📞 Leads after contact filter:', filtered.length);
    }

    // Appliquer le filtre de catégorie
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(lead => {
        const matches = selectedCategories.includes(lead.openai_step3_categorie || '');
        if (!matches) {
          console.log('❌ Lead filtered out by category:', lead.id, lead.openai_step3_categorie);
        }
        return matches;
      });
      console.log('🏷️ Leads after category filter:', filtered.length);
    }

    // Appliquer les filtres de catégorie d'entreprise (exclusion)
    if (selectedCompanyCategories.length > 0) {
      filtered = filtered.filter(lead => {
        const companyCategorie = lead.company_categorie?.toLowerCase() || '';
        const shouldExclude = selectedCompanyCategories.includes(companyCategorie);
        if (shouldExclude) {
          console.log(`🏢 Lead filtered out by company category: ${lead.author_name}, category: ${companyCategorie}`);
        }
        return !shouldExclude;
      });
      console.log('🏢 Leads after company category filter:', filtered.length);
    }

    // Filtre par nombre d'employés
    if (minEmployees || maxEmployees) {
      filtered = filtered.filter(lead => {
        const employeeCount = lead.company_employee_count;
        if (!employeeCount) return false;
        
        const extractNumber = (str: string): number => {
          const match = str.match(/(\d+)(?:-(\d+))?/);
          if (!match) return 0;
          if (match[2]) {
            return (parseInt(match[1]) + parseInt(match[2])) / 2;
          }
          return parseInt(match[1]);
        };

        const employeeNumber = extractNumber(employeeCount);
        const min = minEmployees ? parseInt(minEmployees) : 0;
        const max = maxEmployees ? parseInt(maxEmployees) : Infinity;
        
        return employeeNumber >= min && employeeNumber <= max;
      });
      console.log('👥 Leads after employee count filter:', filtered.length);
    }

    setFilteredLeads(filtered);
  };

  const refreshLeads = async () => {
    console.log('🔄 Refreshing leads...');
    await fetchLeads();
  };

  // Effet pour charger les leads au démarrage
  useEffect(() => {
    console.log('🚀 Initial load of leads');
    fetchLeads();
  }, []);

  // Effet pour appliquer les filtres quand les données ou les filtres changent
  useEffect(() => {
      applyAllFilters();
  }, [
    allLeads,
    selectedCategories,
    selectedDateFilter,
    selectedContactFilter,
    selectedCompanyCategories,
    minEmployees,
    maxEmployees
  ]);

  // Log filtered results for debugging
  useEffect(() => {
    console.log(`📊 Filtered leads: ${filteredLeads.length} out of ${allLeads.length} total leads`);
    if (selectedCompanyCategories.length > 0) {
      console.log('Current exclusion categories:', selectedCompanyCategories);
    }
  }, [filteredLeads, allLeads, selectedCompanyCategories]);

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
