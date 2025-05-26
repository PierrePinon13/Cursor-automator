import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTimeAgo } from '@/utils/timeUtils';

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
  openai_step2_localisation: string;
  openai_step3_categorie: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_justification: string;
}

interface Column {
  id: string;
  label: string;
  width?: string;
  render: (lead: Lead) => React.ReactNode;
}

interface DraggableTableProps {
  leads: Lead[];
  visibleColumns: string[];
}

const DraggableTable = ({ leads, visibleColumns }: DraggableTableProps) => {
  const allColumns: Column[] = [
    {
      id: 'posted_date',
      label: 'Posted Date',
      width: '120px',
      render: (lead) => (
        <span className="text-sm">
          {getTimeAgo(lead.posted_at_iso || lead.created_at)}
        </span>
      )
    },
    {
      id: 'job_title',
      label: 'Titre de poste recherché',
      width: '200px',
      render: (lead) => (
        <div className="space-y-1">
          {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
            <Badge key={index} variant="outline" className="text-xs mr-1">
              {poste}
            </Badge>
          ))}
        </div>
      )
    },
    {
      id: 'author_name',
      label: 'Prénom et Nom',
      width: '150px',
      render: (lead) => (
        <span className="font-medium text-sm">{lead.author_name || 'N/A'}</span>
      )
    },
    {
      id: 'company',
      label: 'Entreprise',
      width: '150px',
      render: (lead) => (
        <span className="text-sm truncate">{lead.author_headline || 'N/A'}</span>
      )
    },
    {
      id: 'post_url',
      label: 'URL du post',
      width: '100px',
      render: (lead) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(lead.url, '_blank')}
          className="h-8 w-8 p-0"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )
    },
    {
      id: 'status',
      label: 'Statut',
      width: '100px',
      render: (lead) => (
        <Badge className="text-xs">
          {lead.openai_step3_categorie || 'En cours'}
        </Badge>
      )
    },
    {
      id: 'category',
      label: 'Catégorie',
      width: '120px',
      render: (lead) => (
        <Badge variant="secondary" className="text-xs">
          {lead.openai_step3_categorie}
        </Badge>
      )
    },
    {
      id: 'location',
      label: 'Localisation',
      width: '120px',
      render: (lead) => (
        <span className="text-sm">{lead.openai_step2_localisation || 'France'}</span>
      )
    }
  ];

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
    <div className="w-full overflow-auto">
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <table className="w-full border-collapse bg-white">
          <Droppable droppableId="columns" direction="horizontal">
            {(provided) => (
              <thead ref={provided.innerRef} {...provided.droppableProps}>
                <tr className="border-b">
                  {displayedColumns.map((column, index) => (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <th
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`text-left p-3 font-medium text-sm bg-gray-50 cursor-grab select-none ${
                            snapshot.isDragging ? 'shadow-lg cursor-grabbing' : ''
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            width: column.width,
                          }}
                        >
                          {column.label}
                        </th>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </tr>
              </thead>
            )}
          </Droppable>
          <tbody>
            {leads.map((lead, rowIndex) => (
              <tr
                key={lead.id}
                className={`border-b hover:bg-gray-50 ${
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                }`}
              >
                {displayedColumns.map((column) => (
                  <td
                    key={column.id}
                    className="p-3 text-sm"
                    style={{ width: column.width }}
                  >
                    {column.render(lead)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </DragDropContext>
    </div>
  );
};

export default DraggableTable;
