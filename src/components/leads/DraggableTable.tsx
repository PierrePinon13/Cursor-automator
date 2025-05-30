import React, { useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { allColumns } from './table/columnDefinitions';
import DraggableTableHeader from './table/DraggableTableHeader';
import TableRow from './table/TableRow';
import LeadDetailDialog from './LeadDetailDialog';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface DraggableTableProps {
  leads: Lead[];
  visibleColumns: string[];
  onActionCompleted: () => void;
  selectedLeadIndex: number | null;
  onLeadSelect: (index: number | null) => void;
}

const DraggableTable = ({ leads, visibleColumns, onActionCompleted, selectedLeadIndex, onLeadSelect }: DraggableTableProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleRowClick = (leadIndex: number, event: React.MouseEvent) => {
    // Ne pas ouvrir la dialog si on clique sur un lien
    if ((event.target as HTMLElement).closest('a, button, [data-clickable="true"]')) {
      return;
    }
    onLeadSelect(leadIndex);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    onLeadSelect(null);
  };

  const handleNavigateToLead = (index: number) => {
    onLeadSelect(index);
  };

  const handleActionCompleted = () => {
    // Appeler la fonction de callback pour rafraîchir les données
    onActionCompleted();
    
    // Passer au lead suivant après une action
    if (selectedLeadIndex !== null && selectedLeadIndex < leads.length - 1) {
      onLeadSelect(selectedLeadIndex + 1);
    } else {
      // Si c'est le dernier lead, fermer la dialog
      handleCloseDialog();
    }
  };

  const [columnOrder, setColumnOrder] = useState(
    allColumns.filter(col => visibleColumns.includes(col.id)).map(col => col.id)
  );

  const handleOnDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(columnOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setColumnOrder(items);
  };

  const handleSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === columnId && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key: columnId, direction });
  };

  const getSortValue = (lead: Lead, columnId: string): any => {
    switch (columnId) {
      case 'posted_date':
        return lead.posted_at_timestamp || new Date(lead.posted_at_iso || lead.created_at).getTime();
      case 'last_updated':
        return lead.last_updated_at ? new Date(lead.last_updated_at).getTime() : 0;
      case 'author_name':
        return lead.author_name?.toLowerCase() || '';
      case 'company':
        return lead.unipile_company?.toLowerCase() || '';
      case 'last_contact':
        return lead.last_contact_at ? new Date(lead.last_contact_at).getTime() : 0;
      case 'category':
        return lead.openai_step3_categorie?.toLowerCase() || '';
      case 'location':
        return lead.openai_step2_localisation?.toLowerCase() || '';
      default:
        return '';
    }
  };

  const sortedLeads = React.useMemo(() => {
    if (!sortConfig) return leads;

    return [...leads].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [leads, sortConfig]);

  const displayedColumns = columnOrder
    .filter(colId => visibleColumns.includes(colId))
    .map(colId => allColumns.find(col => col.id === colId)!)
    .filter(Boolean);

  return (
    <div className="w-full">
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <table className="w-full border-collapse bg-white min-h-screen">
          <DraggableTableHeader 
            displayedColumns={displayedColumns} 
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          <tbody>
            {sortedLeads.map((lead, rowIndex) => (
              <TableRow
                key={lead.id}
                lead={lead}
                rowIndex={rowIndex}
                displayedColumns={displayedColumns}
                onRowClick={handleRowClick}
              />
            ))}
          </tbody>
        </table>
      </DragDropContext>
      
      <LeadDetailDialog 
        leads={sortedLeads}
        selectedLeadIndex={selectedLeadIndex}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onNavigateToLead={handleNavigateToLead}
        onActionCompleted={handleActionCompleted}
      />
    </div>
  );
};

export default DraggableTable;
