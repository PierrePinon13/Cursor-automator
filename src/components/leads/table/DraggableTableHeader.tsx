
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Column } from './columnDefinitions';

interface DraggableTableHeaderProps {
  displayedColumns: Column[];
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  } | null;
  onSort?: (columnId: string) => void;
}

const DraggableTableHeader = ({ displayedColumns, sortConfig, onSort }: DraggableTableHeaderProps) => {
  const getSortableColumns = () => [
    'posted_date',
    'last_updated',
    'author_name',
    'company',
    'last_contact',
    'category',
    'location'
  ];

  const renderSortButton = (columnId: string) => {
    const sortableColumns = getSortableColumns();
    if (!sortableColumns.includes(columnId) || !onSort) return null;

    const isActive = sortConfig?.key === columnId;
    const direction = isActive ? sortConfig.direction : null;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSort(columnId);
        }}
        className="ml-1 inline-flex flex-col hover:bg-gray-200 rounded p-0.5 transition-colors"
        data-clickable="true"
      >
        <ChevronUp 
          className={`h-2.5 w-2.5 ${
            isActive && direction === 'asc' 
              ? 'text-blue-600' 
              : 'text-gray-400 hover:text-gray-600'
          }`} 
        />
        <ChevronDown 
          className={`h-2.5 w-2.5 -mt-0.5 ${
            isActive && direction === 'desc' 
              ? 'text-blue-600' 
              : 'text-gray-400 hover:text-gray-600'
          }`} 
        />
      </button>
    );
  };

  return (
    <Droppable droppableId="columns" direction="horizontal">
      {(provided) => (
        <thead ref={provided.innerRef} {...provided.droppableProps}>
          <tr className="border-b border-gray-200 bg-gray-50">
            {displayedColumns.map((column, index) => (
              <Draggable key={column.id} draggableId={column.id} index={index}>
                {(provided, snapshot) => (
                  <th
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`
                      text-left px-4 py-2 font-medium text-xs whitespace-nowrap
                      border-b border-gray-100
                      ${index < displayedColumns.length - 1 ? 'border-r border-gray-100' : ''}
                      bg-inherit
                      ${snapshot.isDragging ? 'shadow outline outline-1 outline-blue-200' : ''}
                      transition-all
                    `}
                    style={{
                      ...provided.draggableProps.style,
                      width: column.width,
                      minWidth: column.minWidth || column.width,
                      maxWidth: column.width,
                      backgroundColor: 'inherit'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-gray-700">{column.label}</span>
                      {renderSortButton(column.id)}
                    </div>
                  </th>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </tr>
        </thead>
      )}
    </Droppable>
  );
};

export default DraggableTableHeader;
