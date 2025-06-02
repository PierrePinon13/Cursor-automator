
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Activity {
  id: string;
  activity_type: 'linkedin_message' | 'phone_call';
  activity_data: any;
  outcome: string | null;
  performed_by_user_id: string;
  performed_by_user_name: string | null;
  performed_at: string;
  created_at: string;
  lead_id: string;
  lead?: {
    id: string;
    author_name: string | null;
    author_headline: string | null;
    author_profile_url: string | null;
    company_name: string | null;
    company_position: string | null;
    matched_client_name: string | null;
    latest_post_urn: string | null;
    latest_post_url: string | null;
  };
}

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchActivities = async (
    filterBy: 'all' | 'mine' = 'all',
    activityTypes: string[] = ['linkedin_message', 'phone_call'],
    timeFilter: string = 'all',
    customRange?: { from?: Date; to?: Date }
  ) => {
    if (!user) {
      console.log('❌ No user found, cannot fetch activities');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Fetching activities with filters:', {
        filterBy,
        activityTypes,
        timeFilter,
        customRange,
        userId: user.id
      });

      let query = supabase
        .from('activities')
        .select(`
          *,
          lead:leads(
            id,
            author_name,
            author_headline,
            author_profile_url,
            company_name,
            company_position,
            matched_client_name,
            latest_post_urn,
            latest_post_url
          )
        `)
        .in('activity_type', activityTypes)
        .order('performed_at', { ascending: false });

      // Filtre par utilisateur
      if (filterBy === 'mine') {
        query = query.eq('performed_by_user_id', user.id);
      }

      // Filtre par période
      if (timeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (timeFilter) {
          case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'this-week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay() + 1); // Lundi de cette semaine
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'this-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'custom':
            if (customRange?.from) {
              startDate = customRange.from;
            } else {
              startDate = new Date(0); // Si pas de date de début, prendre tout
            }
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte('performed_at', startDate.toISOString());

        // Pour le filtre custom, ajouter aussi la date de fin si elle existe
        if (timeFilter === 'custom' && customRange?.to) {
          const endDate = new Date(customRange.to);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('performed_at', endDate.toISOString());
        }
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('❌ Error fetching activities:', error);
        throw error;
      }

      console.log('📋 Raw activities data:', data?.length || 0, data?.slice(0, 3));
      
      // Vérifier le contenu des données
      if (data && data.length > 0) {
        console.log('📊 Activity types found:', [...new Set(data.map(a => a.activity_type))]);
        console.log('📊 Users found:', [...new Set(data.map(a => a.performed_by_user_name))]);
        console.log('📊 Sample activity:', data[0]);
      }

      setActivities(data || []);
    } catch (error) {
      console.error('💥 Error in fetchActivities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les activités au montage
  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  return {
    activities,
    loading,
    fetchActivities
  };
};
