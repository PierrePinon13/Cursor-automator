
import { useState } from 'react';
import { useToast } from './use-toast';

export const useLeadInteractions = () => {
  const [slidingLeadId, setSlidingLeadId] = useState<string | null>(null);
  const { toast } = useToast();

  const slideToNextLead = (leadId: string, onComplete?: () => void) => {
    setSlidingLeadId(leadId);
    
    setTimeout(() => {
      setSlidingLeadId(null);
      if (onComplete) {
        onComplete();
      }
    }, 300);
  };

  const showSuccessToast = (message: string, profileUrl?: string, leadName?: string) => {
    const toastElement = document.createElement('div');
    toastElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 transition-transform duration-300 transform translate-y-0';
    toastElement.innerHTML = `
      <div class="flex items-center gap-3">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <div>
          <div class="font-medium">${message}</div>
          ${profileUrl ? `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="text-green-100 hover:text-white underline text-sm">Voir le profil de ${leadName || 'ce lead'} →</a>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(toastElement);

    // Animation d'apparition
    requestAnimationFrame(() => {
      toastElement.style.transform = 'translateY(0)';
    });

    // Disparition après 4 secondes
    setTimeout(() => {
      toastElement.style.transform = 'translateY(-100%)';
      toastElement.style.opacity = '0';
      
      setTimeout(() => {
        if (document.body.contains(toastElement)) {
          document.body.removeChild(toastElement);
        }
      }, 300);
    }, 4000);
  };

  return {
    slidingLeadId,
    slideToNextLead,
    showSuccessToast
  };
};
