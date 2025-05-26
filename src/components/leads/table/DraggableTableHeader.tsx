
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Column } from './columnDefinitions';

interface DraggableTableHeaderProps {
  displayedColumns: Column[];
}

const DraggableTableHeader = ({ displayedColumns }: DraggableTableHeaderProps) => {
  return (
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
                    className={`text-left p-2 font-medium text-xs bg-gray-50 cursor-grab select-none whitespace-nowrap border-b border-gray-200 ${
                      index < displayedColumns.length - 1 ? 'border-r border-gray-200' : ''
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
  );
};

export default DraggableTableHeader;
