
import React from 'react';
import { AutomaticDatasetReprocessing } from '@/components/admin/AutomaticDatasetReprocessing';

export default function DatasetReprocessingExecution() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Exécution du retraitement</h1>
        <AutomaticDatasetReprocessing />
      </div>
    </div>
  );
}
