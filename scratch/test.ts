import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kriynwzshkzaqjlnoqwf.supabase.co';
const supabaseKey = 'sb_publishable_2R7C9bdDO6c7UEr_e-clVw_tOZEO60c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      preacher:people!events_preacher_id_fkey(id, name),
      worship_leader:people!events_worship_leader_id_fkey(id, name),
      sound_person:people!events_sound_person_id_fkey(id, name),
      responsible_person:people!events_responsible_person_id_fkey(id, name),
      event_needs(need_type:event_needs_types(name)),
      participants:event_participants(
        person_id,
        role:roles(name),
        person:people(name)
      ),
      sub_events:events(
        id,
        title,
        event_types(name),
        ministries(name),
        responsible_person:people!events_responsible_person_id_fkey(name)
      )
    `)
    .limit(1);

  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS:', data.length > 0 ? 'Data fetched' : 'No data');
  }
}

run();
