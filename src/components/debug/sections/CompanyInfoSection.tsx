
import React from 'react';

interface CompanyInfoSectionProps {
  leadData: any;
}

const CompanyInfoSection = ({ leadData }: CompanyInfoSectionProps) => {
  return (
    <div className="border-2 border-green-200 p-4 rounded-lg bg-green-50">
      <h3 className="font-semibold text-lg mb-3 text-green-800">🏢 Informations d'Entreprise</h3>
      <div className="space-y-3">
        <div><strong>Entreprise actuelle:</strong> {leadData.unipile_company || leadData.company_name || 'Non récupérée'}</div>
        <div><strong>Poste actuel:</strong> {leadData.unipile_position || 'Non récupéré'}</div>
        <div><strong>Company ID:</strong> {leadData.company_id || 'Non assigné'}</div>
        <div><strong>LinkedIn ID entreprise:</strong> {leadData.unipile_company_linkedin_id || leadData.company_linkedin_id || 'Non récupéré'}</div>
        
        {leadData.companies && (
          <div className="mt-3 p-2 bg-white rounded border">
            <strong>Données enrichies d'entreprise:</strong>
            <div className="text-sm mt-1">
              <div>Nom: {leadData.companies.name}</div>
              <div>Industrie: {leadData.companies.industry}</div>
              <div>Taille: {leadData.companies.company_size}</div>
              <div>Siège: {leadData.companies.headquarters}</div>
              <div>Description: {leadData.companies.description ? 'Présente' : 'Absente'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyInfoSection;
