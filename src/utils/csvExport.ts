
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
  unipile_company: string;
  unipile_position: string;
  unipile_profile_scraped: boolean;
  unipile_profile_scraped_at: string;
}

const columnOptions = [
  { value: 'posted_date', label: 'Posted Date' },
  { value: 'job_title', label: 'Titre de poste recherché' },
  { value: 'author_name', label: 'Prénom et Nom' },
  { value: 'company', label: 'Entreprise' },
  { value: 'post_url', label: 'URL du post' },
  { value: 'status', label: 'Statut' },
  { value: 'category', label: 'Catégorie' },
  { value: 'location', label: 'Localisation' },
];

export const exportLeadsToCSV = (leads: Lead[], visibleColumns: string[]) => {
  const headers = visibleColumns.map(colId => 
    columnOptions.find(opt => opt.value === colId)?.label || colId
  );
  
  const csvContent = [
    headers.join(','),
    ...leads.map(lead => {
      return visibleColumns.map(colId => {
        switch(colId) {
          case 'posted_date':
            return lead.posted_at_iso 
              ? new Date(lead.posted_at_iso).toLocaleDateString('fr-FR')
              : new Date(lead.created_at).toLocaleDateString('fr-FR');
          case 'job_title':
            return `"${lead.openai_step3_postes_selectionnes?.join(', ') || ''}"`;
          case 'author_name':
            return `"${lead.author_name || ''}"`;
          case 'company':
            // Prioritize Unipile data over basic headline
            if (lead.unipile_company) {
              const companyInfo = lead.unipile_position 
                ? `${lead.unipile_company} - ${lead.unipile_position}`
                : lead.unipile_company;
              return `"${companyInfo}"`;
            }
            return `"${lead.author_headline || ''}"`;
          case 'post_url':
            return lead.url;
          case 'status':
          case 'category':
            return lead.openai_step3_categorie || '';
          case 'location':
            return lead.openai_step2_localisation || 'France';
          default:
            return '';
        }
      }).join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
