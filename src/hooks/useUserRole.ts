
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

      // Pour l'instant, déterminons le rôle admin basé sur l'email
      // Cette logique peut être changée plus tard
      const adminEmails = [
        'admin@example.com', // Remplacez par les emails admin réels
        // Ajoutez d'autres emails admin ici
      ];

      setIsAdmin(adminEmails.includes(user.email || ''));
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  return { isAdmin, loading };
};
