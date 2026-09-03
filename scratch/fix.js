const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const eventId = 'd28535eb-fce4-4a8c-ab51-e5da89a3cbb3';
  
  // Get liturgy
  const { data: liturgy } = await supabase.from('liturgies').select('id').eq('event_id', eventId).single();
  if (!liturgy) return;
  
  // Delete 2 and 3
  await supabase.from('liturgy_items')
    .delete()
    .eq('liturgy_id', liturgy.id)
    .in('title', ['Louvor Congregacional 2', 'Louvor Congregacional 3']);
    
  // Rename 1
  await supabase.from('liturgy_items')
    .update({ title: 'Louvores Congregacionais' })
    .eq('liturgy_id', liturgy.id)
    .eq('title', 'Louvor Congregacional 1');
    
  console.log('Fixed');
}

fix();
