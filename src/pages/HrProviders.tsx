
import { SidebarTrigger } from '@/components/ui/sidebar';

const HrProviders = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-4 mb-6">
        <SidebarTrigger />
        <h1 className="text-2xl font-bold text-gray-900">Prestataires RH</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Prestataires RH</h2>
          <p className="text-gray-600">
            Cette section sera développée prochainement pour gérer vos prestataires RH.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HrProviders;
