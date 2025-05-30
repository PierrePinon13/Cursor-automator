
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  console.log('Index page rendered');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Index useEffect - user:', user?.id, 'loading:', loading);
    // Si l'utilisateur est connecté, le rediriger vers le tableau de bord
    if (!loading && user) {
      console.log('User is authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Afficher un loader pendant la vérification de l'authentification
  if (loading) {
    console.log('Index: showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  // Si pas d'utilisateur connecté, afficher la page d'accueil
  console.log('Index: showing welcome page');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Automator</CardTitle>
          <CardDescription>
            Bienvenue sur votre CRM de prospection LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full" 
            onClick={() => {
              console.log('Navigating to auth page');
              navigate('/auth');
            }}
          >
            Se connecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
