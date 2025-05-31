
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('🔍 Fetching all users...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
      }
      
      console.log('✅ Users fetched successfully:', data?.length || 0);
      console.log('👥 User details:', data?.map(u => ({ 
        id: u.id, 
        email: u.email, 
        full_name: u.full_name 
      })));
      
      setUsers(data || []);
    } catch (error) {
      console.error('💥 Error in fetchUsers:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    refreshUsers: fetchUsers
  };
}
