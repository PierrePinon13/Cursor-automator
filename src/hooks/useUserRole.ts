
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkAdminRole = () => {
      console.log('Checking admin role for user:', user?.email);
      
      if (!user || !user.email) {
        console.log('No user or email found');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Configurer les emails admin
      const adminEmails = [
        'pierre.pinon@gmail.com',
        'ppinon@getpro.fr',
        'admin@example.com',
      ];

      const userIsAdmin = adminEmails.includes(user.email.toLowerCase());
      console.log('User is admin:', userIsAdmin, 'Email:', user.email);
      
      setIsAdmin(userIsAdmin);
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  return { isAdmin, loading };
};
