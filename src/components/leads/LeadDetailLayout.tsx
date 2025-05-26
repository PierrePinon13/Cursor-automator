
import React from 'react';

interface LeadDetailLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

const LeadDetailLayout = ({ leftPanel, centerPanel, rightPanel }: LeadDetailLayoutProps) => {
  return (
    <div className="flex h-[calc(90vh-120px)]">
      {/* Section gauche - Synthèse du lead */}
      <div className="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
        {leftPanel}
      </div>

      {/* Section milieu - Message pré-rédigé */}
      <div className="w-1/3 p-6 border-r overflow-y-auto">
        {centerPanel}
      </div>

      {/* Section droite - Boutons d'actions */}
      <div className="w-1/3 p-6 overflow-y-auto">
        {rightPanel}
      </div>
    </div>
  );
};

export default LeadDetailLayout;
