
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart3, Linkedin, Zap, Shield } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gray-900">
              CRM LinkedIn Intelligent
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Analysez automatiquement les publications LinkedIn et détectez les opportunités de recrutement en France grâce à l'IA
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="px-8">
                Commencer maintenant
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Linkedin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Connexion LinkedIn</h3>
              <p className="text-gray-600">
                Connectez votre compte LinkedIn via l'API Unipile pour analyser vos publications
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold">Analyse IA</h3>
              <p className="text-gray-600">
                OpenAI analyse automatiquement les publications pour identifier les besoins de recrutement
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Dashboard CRM</h3>
              <p className="text-gray-600">
                Visualisez et gérez vos leads qualifiés dans une interface moderne et intuitive
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
