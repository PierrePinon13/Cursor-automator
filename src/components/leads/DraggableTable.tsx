
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

interface Column {
  id: string;
  label: string;
  width?: string;
  minWidth?: string;
  render: (lead: Lead) => React.ReactNode;
}

interface DraggableTableProps {
  leads: Lead[];
  visibleColumns: string[];
}

const categoryColors = {
  'Tech': 'bg-blue-100 border-blue-300 text-blue-800',
  'Business': 'bg-green-100 border-green-300 text-green-800',
  'Product': 'bg-purple-100 border-purple-300 text-purple-800',
  'Executive Search': 'bg-red-100 border-red-300 text-red-800',
  'Comptelio': 'bg-yellow-100 border-yellow-300 text-yellow-800',
  'RH': 'bg-pink-100 border-pink-300 text-pink-800',
  'Freelance': 'bg-indigo-100 border-indigo-300 text-indigo-800',
  'Data': 'bg-teal-100 border-teal-300 text-teal-800'
};

const DraggableTable = ({ leads, visibleColumns }: DraggableTableProps) => {
  const allColumns: Column[] = [
    {
      id: 'posted_date',
      label: 'Posted Date',
      width: '77px',
      minWidth: '77px',
      render: (lead) => (
        <span className="text-xs whitespace-nowrap">
          {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
        </span>
      )
    },
    {
      id: 'job_title',
      label: 'Profil recherché',
      width: '108px',
      minWidth: '108px',
      render: (lead) => (
        <div 
          className="group cursor-pointer hover:bg-blue-50 rounded-md p-1.5 -m-1.5 transition-all duration-200 relative w-full h-full flex items-center"
          onClick={() => window.open(lead.url, '_blank')}
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <div className="flex-1">
              {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                <div key={index} className="text-green-600 text-xs group-hover:text-green-700">
                  {poste}
                  {index < lead.openai_step3_postes_selectionnes.length - 1 && <br />}
                </div>
              ))}
            </div>
            <ExternalLink className="h-2.5 w-2.5 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 mt-0.5" />
          </div>
        </div>
      )
    },
    {
      id: 'author_name',
      label: 'Lead',
      width: '110px',
      render: (lead) => (
        <div 
          className="group cursor-pointer hover:bg-blue-50 rounded-md p-1.5 -m-1.5 transition-all duration-200 relative w-full h-full flex items-center"
          onClick={() => window.open(lead.author_profile_url, '_blank')}
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="font-medium text-xs group-hover:text-blue-700 transition-colors">
              {lead.author_name || 'N/A'}
            </span>
            <ExternalLink className="h-2.5 w-2.5 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" />
          </div>
        </div>
      )
    },
    {
      id: 'company',
      label: 'Entreprise',
      width: '200px',
      render: (lead) => (
        <div className="space-y-1">
          {lead.unipile_company ? (
            <div>
              <div className="font-medium text-xs">{lead.unipile_company}</div>
              {lead.unipile_position && (
                <div className="text-xs text-gray-600">{lead.unipile_position}</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              <div>Données non disponibles</div>
              <div className="text-xs text-gray-400 truncate">{lead.author_headline || 'N/A'}</div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'category',
      label: 'Catégorie',
      width: '100px',
      render: (lead) => {
        const colorClass = categoryColors[lead.openai_step3_categorie as keyof typeof categoryColors] || 'bg-gray-100 border-gray-300 text-gray-800';
        return (
          <Badge variant="outline" className={`text-xs px-2 py-0.5 ${colorClass}`}>
            {lead.openai_step3_categorie}
          </Badge>
        );
      }
    },
    {
      id: 'location',
      label: 'Localisation',
      width: '100px',
      render: (lead) => (
        <span className="text-xs">{lead.openai_step2_localisation || 'France'}</span>
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
    <div className="w-full -ml-6">
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <table className="w-full border-collapse bg-white border-separate border-spacing-0">
          <Droppable droppableId="columns" direction="horizontal">
            {(provided) => (
              <thead ref={provided.innerRef} {...provided.droppableProps}>
                <tr>
                  {displayedColumns.map((column, index) => (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <th
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`text-left p-2 font-medium text-xs bg-gray-50 cursor-grab select-none whitespace-nowrap border-r border-b border-gray-200 ${
                            index === 0 ? '' : 'border-l'
                          } ${
                            snapshot.isDragging ? 'shadow-lg cursor-grabbing' : ''
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            width: column.width,
                            minWidth: column.minWidth || column.width,
                            maxWidth: column.width,
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
                className={`hover:bg-gray-50 ${
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                }`}
              >
                {displayedColumns.map((column, index) => (
                  <td
                    key={column.id}
                    className={`p-2 text-xs border-r border-b border-gray-200 ${
                      index === 0 ? '' : 'border-l'
                    }`}
                    style={{ 
                      width: column.width,
                      minWidth: column.minWidth || column.width,
                      maxWidth: column.width,
                    }}
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
