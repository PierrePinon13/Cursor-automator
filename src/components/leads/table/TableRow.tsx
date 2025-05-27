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
  unipile_response?: any;
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
  last_updated_at?: string | null;
}

interface TableRowProps {
  lead: Lead;
  rowIndex: number;
  displayedColumns: Column[];
  onRowClick: (leadIndex: number, event: React.MouseEvent) => void;
}

const TableRow = ({ lead, rowIndex, displayedColumns, onRowClick }: TableRowProps) => {
  console.log('TableRow lead data:', {
    id: lead.id,
    author_name: lead.author_name,
    unipile_company: lead.unipile_company,
    unipile_position: lead.unipile_position
  });

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
