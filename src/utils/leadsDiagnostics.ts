
import { supabase } from '@/integrations/supabase/client';

export const diagnoseMissingLeads = async () => {
  console.log('🔧 Starting comprehensive leads diagnostics...');
  
  try {
    // Check all processing statuses
    const { data: allPosts, error: allError } = await supabase
      .from('linkedin_posts')
      .select('processing_status, openai_step3_categorie, created_at, author_name, openai_step1_recrute_poste, openai_step2_reponse, text, title, openai_step1_response, openai_step3_response')
      .order('created_at', { ascending: false })
      .limit(100);

    if (allError) {
      console.error('❌ Error fetching all posts:', allError);
      return;
    }

    console.log('📊 PROCESSING STATUS BREAKDOWN:');
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

    console.log('\n🔍 STEP-BY-STEP ANALYSIS:');

    // Step 1 results
    const step1Results = allPosts?.reduce((acc, post) => {
      const result = post.openai_step1_recrute_poste || 'null';
      acc[result] = (acc[result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nStep 1 - Job Posting Detection:');
    Object.entries(step1Results || {}).forEach(([result, count]) => {
      console.log(`  ${result}: ${count} posts`);
    });

    // Step 2 results
    const step2Results = allPosts?.reduce((acc, post) => {
      const result = post.openai_step2_reponse || 'null';
      acc[result] = (acc[result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nStep 2 - Location Detection:');
    Object.entries(step2Results || {}).forEach(([result, count]) => {
      console.log(`  ${result}: ${count} posts`);
    });

    // NEW: Step 3 results
    const step3Results = allPosts?.reduce((acc, post) => {
      const result = post.openai_step3_categorie || 'null';
      acc[result] = (acc[result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nStep 3 - Category Classification:');
    Object.entries(step3Results || {}).forEach(([result, count]) => {
      console.log(`  ${result}: ${count} posts`);
    });

    // Show recent posts that should be visible
    console.log('\n📋 RECENT VALID LEADS (should appear in UI):');
    postsWithValidCategory.slice(0, 10).forEach((post, index) => {
      console.log(`  ${index + 1}. ${post.author_name} - ${post.openai_step3_categorie} (${new Date(post.created_at).toLocaleDateString()})`);
    });

    console.log('\n🚨 FOCUS: POTENTIALLY MISCLASSIFIED "NON" POSTS');
    
    const postsClassifiedAsNon = allPosts?.filter(post => 
      post.openai_step1_recrute_poste === 'Non' || post.openai_step1_recrute_poste === 'non'
    ) || [];
    
    console.log(`Found ${postsClassifiedAsNon.length} posts classified as "Non" in Step 1`);
    
    // Look for potential recruitment keywords in "Non" classified posts
    const recruitmentKeywords = ['recrute', 'recrutement', 'poste', 'offre', 'embauche', 'rejoignez', 'candidat', 'cv', 'emploi', 'hiring', 'job', 'opportunity'];
    const potentiallyMissclassified = postsClassifiedAsNon.filter(post => {
      const fullText = ((post.title || '') + ' ' + (post.text || '')).toLowerCase();
      return recruitmentKeywords.some(keyword => fullText.includes(keyword));
    });

    console.log(`\n⚠️ CRITICAL: ${potentiallyMissclassified.length} posts classified as "Non" but containing recruitment keywords`);
    
    if (potentiallyMissclassified.length > 0) {
      console.log('\n🔍 Sample potentially misclassified posts:');
      potentiallyMissclassified.slice(0, 5).forEach((post, index) => {
        console.log(`\n--- Potentially Misclassified Post ${index + 1} ---`);
        console.log(`Author: ${post.author_name}`);
        console.log(`Title: ${post.title || 'No title'}`);
        console.log(`Text preview: ${(post.text || '').substring(0, 200)}...`);
        console.log(`Step 1 decision: ${post.openai_step1_recrute_poste}`);
        
        // Find recruitment keywords in this specific post
        const foundKeywords = recruitmentKeywords.filter(keyword => 
          ((post.title || '') + ' ' + (post.text || '')).toLowerCase().includes(keyword)
        );
        console.log(`Keywords found: ${foundKeywords.join(', ')}`);
      });
    }

    // Check for posts that made it to Step 3 but got "Autre"
    const postsWithAutreCategory = allPosts?.filter(post => 
      post.openai_step3_categorie === 'Autre'
    ) || [];
    
    if (postsWithAutreCategory.length > 0) {
      console.log(`\n📝 ${postsWithAutreCategory.length} posts classified as "Autre" in Step 3:`);
      postsWithAutreCategory.slice(0, 3).forEach((post, index) => {
        console.log(`\n--- "Autre" Post ${index + 1} ---`);
        console.log(`Author: ${post.author_name}`);
        console.log(`Title: ${post.title || 'No title'}`);
        console.log(`Text preview: ${(post.text || '').substring(0, 150)}...`);
      });
    }

    console.log('\n🔄 PIPELINE FLOW SUMMARY:');
    console.log(`Total posts analyzed: ${allPosts?.length || 0}`);
    console.log(`Step 1 "Oui": ${step1Results?.['Oui'] || 0}`);
    console.log(`Step 2 "Oui": ${step2Results?.['Oui'] || 0}`);
    console.log(`Step 3 valid categories: ${postsWithValidCategory.length}`);
    console.log(`Final leads visible in UI: ${postsWithValidCategory.length}`);
    
    const conversionRate = allPosts?.length ? ((postsWithValidCategory.length / allPosts.length) * 100).toFixed(1) : '0';
    console.log(`Overall conversion rate: ${conversionRate}%`);

  } catch (error) {
    console.error('💥 Error in diagnostics:', error);
  }
};
