
import { useEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

export const useSidebarAutoShow = () => {
  const { setOpen, isMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) return; // Ne pas activer sur mobile

    let timeout: NodeJS.Timeout;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Si la souris est dans les 10 premiers pixels à gauche
      if (e.clientX <= 10) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setOpen(true);
        }, 200); // Délai de 200ms pour éviter l'ouverture accidentelle
      } else if (e.clientX > 250) { // Si la souris est loin de la sidebar
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setOpen(false);
        }, 1000); // Délai de 1s avant de fermer
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [setOpen, isMobile]);
};
