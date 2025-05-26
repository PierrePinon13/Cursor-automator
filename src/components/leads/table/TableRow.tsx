
import React from 'react';
import { Column } from './columnDefinitions';

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

interface TableRowProps {
  lead: Lead;
  rowIndex: number;
  displayedColumns: Column[];
  onRowClick: (leadIndex: number, event: React.MouseEvent) => void;
}

const TableRow = ({ lead, rowIndex, displayedColumns, onRowClick }: TableRowProps) => {
  return (
    <tr
      className={`hover:bg-gray-50 cursor-pointer ${
        rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
      }`}
      onClick={(event) => onRowClick(rowIndex, event)}
    >
      {displayedColumns.map((column, colIndex) => (
        <td
          key={column.id}
          className={`p-2 text-xs border-b border-gray-200 ${
            colIndex < displayedColumns.length - 1 ? 'border-r border-gray-200' : ''
          }`}
          style={{ 
            width: column.width,
            minWidth: column.minWidth || column.width,
            maxWidth: column.width,
          }}
        >
          {column.render(lead, onRowClick, rowIndex)}
        </td>
      ))}
    </tr>
  );
};

export default TableRow;
