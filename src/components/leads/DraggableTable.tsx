
import React, { useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { allColumns } from './table/columnDefinitions';
import DraggableTableHeader from './table/DraggableTableHeader';
import TableRow from './table/TableRow';
import LeadDetailDialog from './LeadDetailDialog';

interface Lead {
  id: string;
  created_at: string;
  author_name: string;
  author_headline: string;
  author_profile_url: string;
  text: string;
  title: string;
  url: string;
  posted_at_iso: string;
  posted_at_timestamp: number;
  openai_step2_localisation: string;
  openai_step3_categorie: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_justification: string;
  unipile_company: string;
  unipile_position: string;
  unipile_profile_scraped: boolean;
  unipile_profile_scraped_at: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
  approach_message?: string | null;
  approach_message_generated?: boolean | null;
  approach_message_generated_at?: string | null;
  is_client_lead?: boolean | null;
  matched_client_name?: string | null;
  matched_client_id?: string | null;
  last_contact_at?: string | null;
  linkedin_message_sent_at?: string | null;
  phone_contact_status?: string | null;
  phone_contact_at?: string | null;
}

interface DraggableTableProps {
  leads: Lead[];
  visibleColumns: string[];
  onActionCompleted: () => void;
  selectedLeadIndex: number | null;
  onLeadSelect: (index: number | null) => void;
}

const DraggableTable = ({ leads, visibleColumns, onActionCompleted, selectedLeadIndex, onLeadSelect }: DraggableTableProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const displayedColumns = columnOrder
    .filter(colId => visibleColumns.includes(colId))
    .map(colId => allColumns.find(col => col.id === colId)!)
    .filter(Boolean);

  return (
    <div className="w-full">
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <table className="w-full border-collapse bg-white min-h-screen">
          <DraggableTableHeader displayedColumns={displayedColumns} />
          <tbody>
            {leads.map((lead, rowIndex) => (
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
        leads={leads}
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
