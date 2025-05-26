
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

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
  minWidth?: number;
  render: (lead: Lead) => React.ReactNode;
}

interface DraggableTableProps {
  leads: Lead[];
  visibleColumns: string[];
}

const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  
  // Get Paris time (UTC+1 in winter, UTC+2 in summer)
  const parisOffset = date.getTimezoneOffset() === -60 ? 2 : 1; // Simple DST check
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const parisTime = new Date(utcTime + (parisOffset * 3600000));
  
  const utcPostTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const parisPostTime = new Date(utcPostTime + (parisOffset * 3600000));
  
  const diffInSeconds = Math.floor((parisTime.getTime() - parisPostTime.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'À l\'instant';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `Il y a ${minutes}${minutes === 1 ? ' minute' : ' minutes'}`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Il y a ${hours}h`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `Il y a ${days} jour${days === 1 ? '' : 's'}`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `Il y a ${months} mois`;
  }
};

const DraggableTable = ({ leads, visibleColumns }: DraggableTableProps) => {
  const allColumns: Column[] = [
    {
      id: 'posted_date',
      label: 'Posted Date',
      minWidth: 120,
      render: (lead) => (
        <span className="text-sm">
          {getTimeAgo(lead.posted_at_iso || lead.created_at)}
        </span>
      )
    },
    {
      id: 'job_title',
      label: 'Titre de poste recherché',
      minWidth: 200,
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
      label: 'Auteur',
      minWidth: 140,
      render: (lead) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">{lead.author_name || 'N/A'}</div>
          <div className="text-xs text-gray-500 truncate">{lead.author_headline || 'N/A'}</div>
        </div>
      )
    },
    {
      id: 'company',
      label: 'Entreprise',
      minWidth: 150,
      render: (lead) => (
        <span className="text-sm truncate">{lead.author_headline || 'N/A'}</span>
      )
    },
    {
      id: 'post_url',
      label: 'URL du post',
      minWidth: 100,
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
      minWidth: 100,
      render: (lead) => (
        <Badge className="text-xs">
          {lead.openai_step3_categorie || 'En cours'}
        </Badge>
      )
    },
    {
      id: 'category',
      label: 'Catégorie',
      minWidth: 120,
      render: (lead) => (
        <Badge variant="secondary" className="text-xs">
          {lead.openai_step3_categorie}
        </Badge>
      )
    },
    {
      id: 'location',
      label: 'Localisation',
      minWidth: 120,
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
    <div className="w-full">
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <ResizablePanelGroup direction="horizontal" className="min-w-full">
            <table className="w-full border-collapse bg-white min-w-max">
              <Droppable droppableId="columns" direction="horizontal">
                {(provided) => (
                  <thead ref={provided.innerRef} {...provided.droppableProps}>
                    <tr className="border-b bg-gray-50">
                      {displayedColumns.map((column, index) => (
                        <React.Fragment key={column.id}>
                          <Draggable draggableId={column.id} index={index}>
                            {(provided, snapshot) => (
                              <th
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`text-left p-3 font-medium text-sm cursor-grab select-none border-r border-gray-200 ${
                                  snapshot.isDragging ? 'shadow-lg cursor-grabbing bg-white' : ''
                                }`}
                                style={{
                                  ...provided.draggableProps.style,
                                  minWidth: column.minWidth,
                                  width: column.minWidth,
                                }}
                              >
                                {column.label}
                              </th>
                            )}
                          </Draggable>
                          {index < displayedColumns.length - 1 && (
                            <ResizableHandle withHandle={false} className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize" />
                          )}
                        </React.Fragment>
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
                    {displayedColumns.map((column, index) => (
                      <td
                        key={column.id}
                        className={`p-3 text-sm ${index < displayedColumns.length - 1 ? 'border-r border-gray-200' : ''}`}
                        style={{ 
                          minWidth: column.minWidth,
                          width: column.minWidth 
                        }}
                      >
                        {column.render(lead)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ResizablePanelGroup>
        </DragDropContext>
      </div>
    </div>
  );
};

export default DraggableTable;
