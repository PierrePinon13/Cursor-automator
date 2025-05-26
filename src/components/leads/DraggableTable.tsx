
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
}

interface DraggableTableProps {
  leads: Lead[];
  visibleColumns: string[];
}

const DraggableTable = ({ leads, visibleColumns }: DraggableTableProps) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (lead: Lead, event: React.MouseEvent) => {
    // Ne pas ouvrir la dialog si on clique sur un lien
    if ((event.target as HTMLElement).closest('a, button')) {
      return;
    }
    setSelectedLead(lead);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedLead(null);
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
        <table className="w-full border-collapse bg-white">
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
        lead={selectedLead}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </div>
  );
};

export default DraggableTable;
