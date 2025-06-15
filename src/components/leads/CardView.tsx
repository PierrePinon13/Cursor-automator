import React, { useState } from 'react';
import { ExternalLink, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTimeAgo } from '@/utils/timeUtils';
import LeadDetailDialog from './LeadDetailDialog';
import { Tables } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { LeadCard } from './LeadCard';

type Lead = Tables<'leads'>;

interface CardViewProps {
  leads: Lead[];
  onActionCompleted: () => void;
  selectedLeadIndex: number | null;
  onLeadSelect: (index: number | null) => void;
}

const categoryColors = {
  'Tech': {
    card: 'bg-gradient-to-br from-blue-50/80 to-blue-100/60 border-blue-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-blue-100/80 to-blue-50/60 border-blue-200/60',
    badge: 'bg-blue-100/80 text-blue-800 border-blue-200/60'
  },
  'Business': {
    card: 'bg-gradient-to-br from-green-50/80 to-green-100/60 border-green-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-green-100/80 to-green-50/60 border-green-200/60',
    badge: 'bg-green-100/80 text-green-800 border-green-200/60'
  },
  'Product': {
    card: 'bg-gradient-to-br from-purple-50/80 to-purple-100/60 border-purple-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-purple-100/80 to-purple-50/60 border-purple-200/60',
    badge: 'bg-purple-100/80 text-purple-800 border-purple-200/60'
  },
  'Executive Search': {
    card: 'bg-gradient-to-br from-red-50/80 to-red-100/60 border-red-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-red-100/80 to-red-50/60 border-red-200/60',
    badge: 'bg-red-100/80 text-red-800 border-red-200/60'
  },
  'Comptelio': {
    card: 'bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 border-yellow-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-yellow-100/80 to-yellow-50/60 border-yellow-200/60',
    badge: 'bg-yellow-100/80 text-yellow-800 border-yellow-200/60'
  },
  'RH': {
    card: 'bg-gradient-to-br from-pink-50/80 to-pink-100/60 border-pink-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-pink-100/80 to-pink-50/60 border-pink-200/60',
    badge: 'bg-pink-100/80 text-pink-800 border-pink-200/60'
  },
  'Freelance': {
    card: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/60 border-indigo-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-indigo-100/80 to-indigo-50/60 border-indigo-200/60',
    badge: 'bg-indigo-100/80 text-indigo-800 border-indigo-200/60'
  },
  'Data': {
    card: 'bg-gradient-to-br from-teal-50/80 to-teal-100/60 border-teal-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-teal-100/80 to-teal-50/60 border-teal-200/60',
    badge: 'bg-teal-100/80 text-teal-800 border-teal-200/60'
  }
};

const CardView = ({ leads, onActionCompleted, selectedLeadIndex, onLeadSelect }: CardViewProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleCardClick = (leadIndex: number, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('a, button, [data-clickable]')) {
      return;
    }
    onLeadSelect(leadIndex);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    onLeadSelect(null);
  };

  const handleNavigateToLead = (newIndex: number) => {
    onLeadSelect(newIndex);
  };

  const handleActionCompleted = () => {
    onActionCompleted();
    
    if (selectedLeadIndex !== null && selectedLeadIndex < leads.length - 1) {
      onLeadSelect(selectedLeadIndex + 1);
    } else {
      handleCloseDialog();
    }
  };

  const getCategoryColors = (category: string) => {
    return categoryColors[category as keyof typeof categoryColors] || {
      card: 'bg-gradient-to-br from-gray-50/80 to-gray-100/60 border-gray-200/60 backdrop-blur-sm',
      header: 'bg-gradient-to-r from-gray-100/80 to-gray-50/60 border-gray-200/60',
      badge: 'bg-gray-100/80 text-gray-800 border-gray-200/60'
    };
  };

  return (
    <>
      <div className="bg-gradient-to-br from-slate-50/20 to-gray-100/20 min-h-screen">
        <div
          className={
            isMobile
              ? "flex flex-col gap-5 p-2"
              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6"
          }
        >
          {leads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isMobile={isMobile}
              onClick={(event) => handleCardClick(index, event)}
            />
          ))}
        </div>
      </div>
      
      <LeadDetailDialog 
        leads={leads}
        selectedLeadIndex={selectedLeadIndex}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onNavigateToLead={handleNavigateToLead}
        onActionCompleted={handleActionCompleted}
      />
    </>
  );
};

export default CardView;
