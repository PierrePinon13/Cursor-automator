
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkAdminRole = () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Configurer les emails admin
      const adminEmails = [
        'pierre.pinon@gmail.com',
        'admin@example.com',
      ];

      setIsAdmin(adminEmails.includes(user.email || ''));
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  return { isAdmin, loading };
};
