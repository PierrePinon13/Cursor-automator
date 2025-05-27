
import { supabase } from '@/integrations/supabase/client';

export const diagnoseMissingLeads = async () => {
  console.log('🔧 Starting leads diagnostics...');
  
  try {
    // Check all processing statuses
    const { data: allPosts, error: allError } = await supabase
      .from('linkedin_posts')
      .select('processing_status, openai_step3_categorie, created_at, author_name, openai_step1_recrute_poste, openai_step2_reponse, text, title, openai_step1_response')
      .order('created_at', { ascending: false })
      .limit(100);

    if (allError) {
      console.error('❌ Error fetching all posts:', allError);
      return;
    }

    console.log('📊 Processing Status Breakdown:');
    const statusBreakdown = allPosts?.reduce((acc, post) => {
      const status = post.processing_status || 'null';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(statusBreakdown || {}).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} posts`);
    });

    // Check completed posts that might be filtered out
    const completedPosts = allPosts?.filter(post => post.processing_status === 'completed') || [];
    console.log(`\n✅ ${completedPosts.length} completed posts found`);

    const postsWithoutCategory = completedPosts.filter(post => 
      !post.openai_step3_categorie || post.openai_step3_categorie === 'Autre'
    );
    console.log(`🚫 ${postsWithoutCategory.length} completed posts without valid category`);

    const postsWithValidCategory = completedPosts.filter(post => 
      post.openai_step3_categorie && post.openai_step3_categorie !== 'Autre'
    );
    console.log(`🏷️ ${postsWithValidCategory.length} completed posts with valid categories (should appear in UI)`);

    // Check step 1 results
    const step1Results = allPosts?.reduce((acc, post) => {
      const result = post.openai_step1_recrute_poste || 'null';
      acc[result] = (acc[result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🔍 Step 1 OpenAI Results (recrute_poste):');
    Object.entries(step1Results || {}).forEach(([result, count]) => {
      console.log(`  ${result}: ${count} posts`);
    });

    // Check step 2 results
    const step2Results = allPosts?.reduce((acc, post) => {
      const result = post.openai_step2_reponse || 'null';
      acc[result] = (acc[result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🌍 Step 2 OpenAI Results (reponse):');
    Object.entries(step2Results || {}).forEach(([result, count]) => {
      console.log(`  ${result}: ${count} posts`);
    });

    // Show recent posts that should be visible
    console.log('\n📋 Recent completed posts with valid categories:');
    postsWithValidCategory.slice(0, 10).forEach((post, index) => {
      console.log(`  ${index + 1}. ${post.author_name} - ${post.openai_step3_categorie} (${new Date(post.created_at).toLocaleDateString()})`);
    });

    // NEW: Analyze posts classified as "Non" but might be recruitment posts
    console.log('\n🚨 INVESTIGATING POSTS CLASSIFIED AS "NON":');
    const postsClassifiedAsNon = allPosts?.filter(post => 
      post.openai_step1_recrute_poste === 'Non' || post.openai_step1_recrute_poste === 'non'
    ) || [];
    
    console.log(`Found ${postsClassifiedAsNon.length} posts classified as "Non"`);
    
    // Show some examples of posts classified as "Non" to analyze
    console.log('\n📝 Sample posts classified as "Non" (first 5):');
    postsClassifiedAsNon.slice(0, 5).forEach((post, index) => {
      console.log(`\n--- Post ${index + 1} ---`);
      console.log(`Author: ${post.author_name}`);
      console.log(`Title: ${post.title || 'No title'}`);
      console.log(`Text preview: ${(post.text || '').substring(0, 200)}...`);
      console.log(`OpenAI Step 1 Response:`, post.openai_step1_response);
      console.log(`Processing Status: ${post.processing_status}`);
    });

    // Look for potential recruitment keywords in "Non" classified posts
    const recruitmentKeywords = ['recrute', 'recrutement', 'poste', 'offre', 'embauche', 'rejoignez', 'candidat', 'cv', 'emploi'];
    const potentiallyMissclassified = postsClassifiedAsNon.filter(post => {
      const fullText = ((post.title || '') + ' ' + (post.text || '')).toLowerCase();
      return recruitmentKeywords.some(keyword => fullText.includes(keyword));
    });

    console.log(`\n⚠️ Found ${potentiallyMissclassified.length} posts classified as "Non" but containing recruitment keywords`);
    
    if (potentiallyMissclassified.length > 0) {
      console.log('\n🔍 Potentially misclassified posts:');
      potentiallyMissclassified.slice(0, 3).forEach((post, index) => {
        console.log(`\n--- Potentially Misclassified Post ${index + 1} ---`);
        console.log(`Author: ${post.author_name}`);
        console.log(`Title: ${post.title || 'No title'}`);
        console.log(`Text: ${(post.text || '').substring(0, 300)}...`);
      });
    }

  } catch (error) {
    console.error('💥 Error in diagnostics:', error);
  }
};
