
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useLeadSelection = (totalLeads: number) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);

  // Restaurer l'index depuis l'URL au chargement
  useEffect(() => {
    const leadIndexParam = searchParams.get('leadIndex');
    if (leadIndexParam !== null) {
      const index = parseInt(leadIndexParam, 10);
      if (!isNaN(index) && index >= 0 && index < totalLeads) {
        setSelectedLeadIndex(index);
      } else {
        // Index invalide, le supprimer de l'URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('leadIndex');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, totalLeads, setSearchParams]);

  // Mettre à jour l'URL quand l'index change
  const updateSelectedLeadIndex = (index: number | null) => {
    setSelectedLeadIndex(index);
    
    const newParams = new URLSearchParams(searchParams);
    if (index !== null) {
      newParams.set('leadIndex', index.toString());
      // Sauvegarder aussi dans sessionStorage comme backup
      sessionStorage.setItem('selectedLeadIndex', index.toString());
    } else {
      newParams.delete('leadIndex');
      sessionStorage.removeItem('selectedLeadIndex');
    }
    setSearchParams(newParams, { replace: true });
  };

  // Fonction pour naviguer vers le lead suivant
  const navigateToNext = () => {
    if (selectedLeadIndex !== null && selectedLeadIndex < totalLeads - 1) {
      updateSelectedLeadIndex(selectedLeadIndex + 1);
    } else if (totalLeads > 0) {
      updateSelectedLeadIndex(0);
    }
  };

  // Fonction pour naviguer vers le lead précédent
  const navigateToPrevious = () => {
    if (selectedLeadIndex !== null && selectedLeadIndex > 0) {
      updateSelectedLeadIndex(selectedLeadIndex - 1);
    } else if (totalLeads > 0) {
      updateSelectedLeadIndex(totalLeads - 1);
    }
  };

  // Fonction pour fermer l'interface
  const closeLeadDetail = () => {
    updateSelectedLeadIndex(null);
  };

  return {
    selectedLeadIndex,
    setSelectedLeadIndex: updateSelectedLeadIndex,
    navigateToNext,
    navigateToPrevious,
    closeLeadDetail
  };
};
