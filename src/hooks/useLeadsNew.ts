
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useAuth } from './useAuth';

export interface LeadNew {
  id: string;
  author_name: string;
  author_headline?: string;
  author_profile_url?: string;
  unipile_company?: string;
  unipile_position?: string;
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
}

export const useLeadsNew = () => {
  const [leads, setLeads] = useState<LeadNew[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('all');
  const [selectedCompanyCategories, setSelectedCompanyCategories] = useState<string[]>([]);
  const [minEmployees, setMinEmployees] = useState<string>('');
  const [maxEmployees, setMaxEmployees] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableCompanyCategories, setAvailableCompanyCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { isAdmin } = useUserRole();
  const { user } = useAuth();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      // First, get leads with their direct company association
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

      const { data: leadsWithDirectCompany, error } = await query;

      if (error) {
        console.error('Error fetching leads:', error);
        return;
      }

      if (!leadsWithDirectCompany) {
        setLeads([]);
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
            .select('linkedin_id, categorie, employee_count')
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
          company_employee_count: companyInfo?.employee_count || null
        };
      });

      console.log(`Fetched ${leadsWithCompanyInfo.length} leads (HR providers, mistargeted, and client leads filtered out)`);
      setLeads(leadsWithCompanyInfo);
      
      // Extract unique categories
      const categories = [...new Set(leadsWithCompanyInfo
        .map(lead => lead.openai_step3_categorie)
        .filter(Boolean)
      )];
      setAvailableCategories(categories);

      // Extract unique company categories
      const companyCategories = [...new Set(leadsWithCompanyInfo
        .map(lead => lead.company_categorie)
        .filter(Boolean)
      )];
      console.log('Available company categories:', companyCategories);
      setAvailableCompanyCategories(companyCategories);
    } catch (error) {
      console.error('Error in fetchLeads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads based on selected criteria
  const filteredLeads = leads.filter(lead => {
    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(lead.openai_step3_categorie || '')) {
      return false;
    }

    // Company category exclusion filter
    if (selectedCompanyCategories.length > 0) {
      const leadCompanyCategory = lead.company_categorie || '';
      const shouldExclude = selectedCompanyCategories.includes(leadCompanyCategory);
      
      if (shouldExclude) {
        console.log(`🚫 EXCLUDING lead: ${lead.author_name} from ${lead.unipile_company} - Category: "${leadCompanyCategory}"`);
        return false;
      }
    }

    // Employee count filter
    if (minEmployees || maxEmployees) {
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
      
      if (employeeNumber < min || employeeNumber > max) return false;
    }

    // Date filter
    if (selectedDateFilter !== 'all') {
      const leadDate = new Date(lead.latest_post_date || lead.posted_at_iso || '');
      const now = new Date();
      const diffTime = now.getTime() - leadDate.getTime();
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (selectedDateFilter) {
        case '24h':
          if (diffHours > 24) return false;
          break;
        case '48h':
          if (diffHours > 48) return false;
          break;
        case '7days':
          if (diffDays > 7) return false;
          break;
      }
    }

    // Contact filter
    if (selectedContactFilter !== 'all') {
      const hasContact = lead.last_contact_at || lead.phone_contact_status || lead.linkedin_message_sent_at;
      
      switch (selectedContactFilter) {
        case 'exclude_none':
          // Inclure tous les leads
          break;
        case 'exclude_1week':
          if (hasContact && lead.last_contact_at) {
            const contactDate = new Date(lead.last_contact_at);
            const diffDays = Math.ceil((new Date().getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) return false;
          }
          break;
        case 'exclude_2weeks':
          if (hasContact && lead.last_contact_at) {
            const contactDate = new Date(lead.last_contact_at);
            const diffDays = Math.ceil((new Date().getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 14) return false;
          }
          break;
        case 'exclude_1month':
          if (hasContact && lead.last_contact_at) {
            const contactDate = new Date(lead.last_contact_at);
            const diffDays = Math.ceil((new Date().getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) return false;
          }
          break;
        case 'exclude_all_contacted':
          if (hasContact) return false;
          break;
        case 'only_my_contacts':
          // Afficher uniquement les leads contactés par l'utilisateur actuel
          if (!user) return false;
          const wasContactedByMe = (
            (lead.linkedin_message_sent_at && lead.contacted_by_user_id === user.id) ||
            (lead.phone_contact_status && lead.phone_contact_by_user_id === user.id)
          );
          if (!wasContactedByMe) return false;
          break;
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        lead.author_name,
        lead.unipile_company,
        lead.openai_step3_categorie,
        lead.openai_step2_localisation,
        lead.text,
        lead.title
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) return false;
    }

    return true;
  });

  const refreshLeads = () => {
    fetchLeads();
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Log filtered results for debugging
  useEffect(() => {
    console.log(`📊 Filtered leads: ${filteredLeads.length} out of ${leads.length} total leads`);
    if (selectedCompanyCategories.length > 0) {
      console.log('Current exclusion categories:', selectedCompanyCategories);
    }
  }, [filteredLeads, leads, selectedCompanyCategories]);

  return {
    leads,
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
    searchQuery,
    setSearchQuery,
    refreshLeads
  };
};
