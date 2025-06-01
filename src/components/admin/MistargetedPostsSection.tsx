
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TriangleAlert, ExternalLink, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MistargetedPost {
  id: string;
  lead_id: string;
  reported_by_user_name: string;
  author_name: string;
  author_profile_url: string;
  reason: string;
  created_at: string;
}

const MistargetedPostsSection = () => {
  const [posts, setPosts] = useState<MistargetedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMistargetedPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mistargeted_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching mistargeted posts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les publications mal ciblées.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('mistargeted_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      toast({
        title: "Succès",
        description: "Publication supprimée de la liste.",
      });
    } catch (error) {
      console.error('Error deleting mistargeted post:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la publication.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMistargetedPosts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TriangleAlert className="h-6 w-6 text-orange-500" />
          Publications mal ciblées ({posts.length})
        </h2>
        <Button onClick={fetchMistargetedPosts} variant="outline">
          Actualiser
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <TriangleAlert className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune publication mal ciblée signalée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{post.author_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Signalé par {post.reported_by_user_name} le{' '}
                      {new Date(post.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePost(post.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Raison :</span>
                    <p className="text-sm text-muted-foreground mt-1">{post.reason}</p>
                  </div>
                  
                  {post.author_profile_url && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(post.author_profile_url, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir le profil LinkedIn
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MistargetedPostsSection;
