
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
  defaultSize: number;
  minSize: number;
  render: (lead: Lead) => React.ReactNode;
}

interface DraggableTableProps {
  leads: Lead[];
  visibleColumns: string[];
}

const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
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
      defaultSize: 10,
      minSize: 8,
      render: (lead) => (
        <span className="text-sm">
          {getTimeAgo(lead.posted_at_iso || lead.created_at)}
        </span>
      )
    },
    {
      id: 'job_title',
      label: 'Titre de poste recherché',
      defaultSize: 20,
      minSize: 15,
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
      defaultSize: 15,
      minSize: 12,
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
      defaultSize: 15,
      minSize: 10,
      render: (lead) => (
        <span className="text-sm truncate">{lead.author_headline || 'N/A'}</span>
      )
    },
    {
      id: 'post_url',
      label: 'URL du post',
      defaultSize: 8,
      minSize: 6,
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
      defaultSize: 10,
      minSize: 8,
      render: (lead) => (
        <Badge className="text-xs">
          {lead.openai_step3_categorie || 'En cours'}
        </Badge>
      )
    },
    {
      id: 'category',
      label: 'Catégorie',
      defaultSize: 12,
      minSize: 10,
      render: (lead) => (
        <Badge variant="secondary" className="text-xs">
          {lead.openai_step3_categorie}
        </Badge>
      )
    },
    {
      id: 'location',
      label: 'Localisation',
      defaultSize: 10,
      minSize: 8,
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
    <div className="w-full h-full overflow-auto border">
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <ResizablePanelGroup direction="horizontal" className="min-w-max">
          <Droppable droppableId="columns" direction="horizontal">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex h-full">
                {displayedColumns.map((column, index) => (
                  <div key={column.id} className="flex">
                    <Draggable draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <ResizablePanel
                          defaultSize={column.defaultSize}
                          minSize={column.minSize}
                          className="border-r"
                        >
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`h-full flex flex-col ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="bg-gray-50 p-3 font-medium text-sm border-b cursor-grab select-none">
                              {column.label}
                            </div>
                            <div className="flex-1">
                              {leads.map((lead, rowIndex) => (
                                <div
                                  key={lead.id}
                                  className={`p-3 text-sm border-b min-h-[60px] flex items-center ${
                                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                                  } hover:bg-gray-50`}
                                >
                                  {column.render(lead)}
                                </div>
                              ))}
                            </div>
                          </div>
                        </ResizablePanel>
                      )}
                    </Draggable>
                    {index < displayedColumns.length - 1 && (
                      <ResizableHandle withHandle />
                    )}
                  </div>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </ResizablePanelGroup>
      </DragDropContext>
    </div>
  );
};

export default DraggableTable;
