
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-8">
          <img 
            src="/lovable-uploads/0e90fa69-04ca-49b9-a111-f75596b70418.png" 
            alt="Automator Logo" 
            className="h-20 w-20 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Automator</h1>
          <p className="text-gray-600">Gérez vos leads LinkedIn efficacement</p>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full"
            size="lg"
          >
            Se connecter / S'inscrire
          </Button>
          
          <p className="text-sm text-gray-500">
            Connectez-vous pour accéder à vos leads et gérer vos connexions LinkedIn
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
