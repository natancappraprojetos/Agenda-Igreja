import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env variables (you should set SUPABASE_URL and SUPABASE_SERVICE_KEY in your env or just hardcode them for this run)
// Since we are running locally, we can use the local dev supabase credentials
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ey...'; 
// Wait, to run locally with full access, we can fetch from the local .env.local file

const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
);

const dataRaw = `
Ação Solidária Adventista (ASA) Diretor(a) Noemi Teresinha Rech Fragoso +5551985732449 (51) 98573-2449 noemiterezinharech@gmail.com
Ancionato/Diretoria Ancião(a) Adair Gilberto da Silva 587-4939 85828940 adairgilberto16@gmail.com
Ancião(a) Alisson Mateus Ermel +5551999773176 alissonermel@gmail.com
Ancião(a) Ezequiel Mello Padilha 982108081 padilha.casarin@gmail.com
Ancião(a) Isabel Caroline Furtado Maria +5551999011431 carolinefurtadomaria@gmail.com
Ancião(a) Mario Antônio Möller 51 99998 9725 mario.moller@hotmail.com
Ancião(a) Natan Cappra de Oliveira 51 997515970 natancappra@yahoo.com.br
Clube de aventureiros Coordenador(a) Alexandra Cavalheiro Maria (510 985751586
Coordenador(a) Magda Furtado Maria 51 999011431 furtadomagda8@gmail.com
Diretor(a) Associado(a) Ana Liz De Moura Garcia 3488-5968 +5551993710789 993710789 analizmoura.garcia@gmail.com
Diretor(a) Queila Souza Coelho 983304067
Clube de Desbravadores Colaborador Tiago Fiuza 9645-2995 97371750 tiiagofiiuza01@gmail.com
Diretor associado Patrícia De Lacerda 30671885 51 84517941 35245273 patricia-nh@hotmail.com
Diretor Anelise Antunes Dos Santos +5551981335617
Comunicação Diretor(a) Associado(a) Débora Leite Da Costa +5551992499779 binhadacosta.nh@gmail.com
Diretor Bruna Nicole Muller +555198622482 bruna.muller@adventistas.org
Diaconato Diácono Chefe Felipe Emilio de Quadros +5551989208230 felipe_quadro@hotmail.com
Diácono Carlos Alberto Cordeiro +5551996358058
Diácono Gelsi Antonio Maciel +555135827421 +5551998068142 g.antoniomaciel@gmail.com
Diácono Jair Rojai da Silva 35724508 95595521
Diácono Jurandir Garcia Miranda +5551991787628
Diácono Wesley Rangel Teles da Silva (51) 99293-0383 rosisilvamendonca33@gmail.com
Diaconisas Diaconisa Chefe Rejane Sueli da Rosa +5551995333664
Diaconisa Marli de Fatima Nunes Maciel 51 3482-7421 51 89067328 marlinunesmaciel@gmail.com
Diaconisa Thamires Suellen dos Santos +5551993503182 thamymatraca@gmail.com
Escola Sabatina Diretor Marciane Menezes Teixeira +5551992108894 marcimenezest02@gmail.com
Professor(a) Associado William De Borba 51 994624626 william.borba1993@gmail.com
Professor(a) Adair Gilberto da Silva 587-4939 85828940 adairgilberto16@gmail.com
Professor(a) Hiago Augusto Fortes +5548920008652 forteshiago@hotmail.com
Professor(a) Maria Antonia Cordeiro (51) 99242-6079
Professor(a) Marineia Ghilardi +5551996168797 ghilardi2@gmail.com
Professor(a) Mario Antônio Möller 51 99998 9725 mario.moller@hotmail.com
Professor(a) Queila Souza Coelho 983304067
Professor(a) Rita de Cassia Mattos +5551994255415 topesenos81@gmail.com
Professor(a) Wesley Rangel Teles da Silva (51) 99293-0383 rosisilvamendonca33@gmail.com
Secretário(a) Tiago Rodrigues da luz +5551996188712 tr957181@gmail.com
Evangelismo Diretor Ezequiel Mello Padilha 982108081 padilha.casarin@gmail.com
Ministério da Criança Diretor Elisete Cristina da Silva +5551982994939 elisetecristinadasilva4@gmail.com
Ministério da Família Diretor(a) Aline Tatiane Aguiar Marques de Quadro 51 992716765 aline-marq@hotmail.com
Diretor(a) Felipe Emilio de Quadros +5551989208230 felipe_quadro@hotmail.com
Ministério da Mulher Diretor Maria Antonia Cordeiro (51) 99242-6079
Ministério da Música Diretor William De Borba 51 994624626 william.borba1993@gmail.com
Equipe de louvor Alisson Mateus Ermel +5551999773176 alissonermel@gmail.com
Equipe de louvor Isabel Caroline Furtado Maria +5551999011431 carolinefurtadomaria@gmail.com
Equipe de louvor Maria Eduarda Souza Tomaz +5551991059785 dudasousaaa1626@gmail.com
Equipe de louvor Paola Bourscheid +5551999272886 paolabourscheid@gmail.com
Equipe de louvor Patrique de Oliveira da Silva 30671885 51 985670877 35245273 patrique_nh@hotmail.com
Equipe de louvor Roger dos Santos Cordeiro +5551995576625 godroger2808@gmail.com
Ministério da Recepção Coordenador(a) Marisa da Costa da Silva 3572-4508 84888362
Recepcionista Claci Rodrigues Antunes 5198532063
Recepcionista Loreni Menezes Teixeira 3586-2696 (51)80206980
Recepcionista Luzia Borges Schwanck Ghilarde +5551998246105
Recepcionista Maria Clari Schwartz +5551995313106 mariaclarischvarz@outlook.com
Recepcionista Teresinha Simon da Silva +5551985005003 versasimon@gmail.com
Ministério da Saúde Diretor Natan Cappra de Oliveira 51 997515970 natancappra@yahoo.com.br
Ministério de Publicações e Espírito de Profecia Diretor(a) Hiago Augusto Fortes +5548920008652 forteshiago@hotmail.com
Ministério do Homem Diretor(a) Dennis Vinicius Rodrigues de Almeida +5551989591221 dennisvinicius.dv@gmail.com
Ministério dos Adolescentes Diretor(a) Sandra Maria Mattos +555198771480 casandra.mattos1982@gmail.com
Professor da ES Andriza Antunes Dos Santos +5551983523070 andriza.santos@adventistas.org
Professor da ES Anelise Antunes Dos Santos +5551981335617
Ministério Jovem Líder Assistente Maria Eduarda Souza Tomaz +5551991059785 dudasousaaa1626@gmail.com
Secretário(a) Marina de Araujo Prates 3588-0701 (51) 982883467 marina94prates@yahoo.com.br
Ministério Pessoal Diretor(a) Gustavo Borges De Oliveira +5551991563553 Gustavo.borges.us@gmail.com
Mordomia Cristã Diretor(a) Patrique de Oliveira da Silva 30671885 51 985670877 35245273 patrique_nh@hotmail.com
Patrimonial Diretor(a) Patrique de Oliveira da Silva 30671885 51 985670877 35245273 patrique_nh@hotmail.com
Relações Publicas e Liberdade Religiosa Diretor(a) Hiago Augusto Fortes +5548920008652 forteshiago@hotmail.com
Secretaria DISTRICT SECRETARY , COORDINATING Talmai Miriã de Oliveira Pedroso +5551997284712 talmaipedroso@gmail.com
Secretário(a) Associado(a) Isadora Fonseca Padilha +5554993294382 isadorafpad@gmail.com
Secretário(a) Sheila de Matos 993480597 sheiladmt@hotmail.com
Sociedade adventista da juventude Diretor Paloma Bourscheid +5551995109959 palomabourscheid@hotmail.com
Sonoplastia Diretor(a) Associado(a) Hiago Augusto Fortes +5548920008652 forteshiago@hotmail.com
Diretor(a) Dennis Vinicius Rodrigues de Almeida +5551989591221 dennisvinicius.dv@gmail.com
Tesouraria Tesoureiro(a) Mario Antônio Möller 51 99998 9725 mario.moller@hotmail.com
`;

async function seed() {
  const lines = dataRaw.trim().split(/\r?\n/);
  
  const { data: roles } = await supabase.from('roles').select('*');
  const { data: ministries } = await supabase.from('ministries').select('*');
  
  let currentMinistry = '';

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Attempt to parse line.
    // The format is roughly: [Ministry (optional)] [Role] [Name] [Phones] [Email]
    // If the line doesn't start with a known role but starts with a known ministry, we update currentMinistry.
    
    let lineRemaining = line.trim();
    
    // Check if line starts with a ministry
    const potentialMinistries = [
      'Ação Solidária Adventista (ASA)', 'Ancionato/Diretoria', 'Clube de aventureiros', 
      'Clube de Desbravadores', 'Comunicação', 'Diaconato', 'Diaconisas', 'Escola Sabatina', 
      'Evangelismo', 'Ministério da Criança', 'Ministério da Família', 'Ministério da Mulher', 
      'Ministério da Música', 'Ministério da Recepção', 'Ministério da Saúde', 
      'Ministério de Publicações e Espírito de Profecia', 'Ministério do Homem', 
      'Ministério dos Adolescentes', 'Ministério Jovem', 'Ministério Pessoal', 
      'Mordomia Cristã', 'Patrimonial', 'Relações Publicas e Liberdade Religiosa', 
      'Secretaria', 'Sociedade adventista da juventude', 'Sonoplastia', 'Tesouraria'
    ];
    
    for (const min of potentialMinistries) {
      if (lineRemaining.startsWith(min)) {
        currentMinistry = min;
        lineRemaining = lineRemaining.substring(min.length).trim();
        break;
      }
    }
    
    // Check role
    const potentialRoles = [
      'Diretor(a) Associado(a)', 'Diretor(a)', 'Diretor associado', 'Diretor', 
      'Ancião(a)', 'Coordenador(a)', 'Colaborador', 'Diácono Chefe', 'Diácono', 
      'Diaconisa Chefe', 'Diaconisa', 'Professor(a) Associado', 'Professor(a)', 
      'Secretário(a)', 'Equipe de louvor', 'Recepcionista', 'Professor da ES', 
      'Líder Assistente', 'DISTRICT SECRETARY , COORDINATING', 'Tesoureiro(a)'
    ];
    
    let currentRole = '';
    for (const role of potentialRoles) {
      if (lineRemaining.startsWith(role)) {
        currentRole = role;
        lineRemaining = lineRemaining.substring(role.length).trim();
        break;
      }
    }
    
    // Now lineRemaining has [Name] [Phones] [Email]
    // Email is usually at the end
    const parts = lineRemaining.split(' ');
    const email = parts.find(p => p.includes('@'));
    
    if (email) {
       lineRemaining = lineRemaining.replace(email, '').trim();
    }
    
    // Extract phones (anything with digits)
    const phones = [];
    const nameParts = [];
    
    const remainingParts = lineRemaining.split(' ');
    for (const p of remainingParts) {
       if (p.match(/\d/)) {
          phones.push(p);
       } else {
          nameParts.push(p);
       }
    }
    
    const name = nameParts.join(' ').replace(/[^a-zA-Zá-úÁ-Ú ]/g, '').trim();
    if (!name) continue;
    
    const phone = phones.join(' ');
    
    console.log({ ministry: currentMinistry, role: currentRole, name, phone, email });
    
    // 1. Upsert Person
    const { data: personData, error: personError } = await supabase
      .from('people')
      .select('*')
      .ilike('name', name)
      .maybeSingle();
      
    let personId;
    if (personData) {
      personId = personData.id;
      // Update phone if we don't have one
      if (!personData.whatsapp && phone) {
         await supabase.from('people').update({ whatsapp: phone }).eq('id', personId);
      }
    } else {
      const { data: newPerson, error: insertError } = await supabase
        .from('people')
        .insert({ name, whatsapp: phone || null })
        .select()
        .single();
        
      if (insertError) console.error("Error inserting person:", name, insertError);
      else personId = newPerson.id;
    }
    
    if (!personId) continue;
    
    // 2. Link Role
    let roleMapName = '';
    if (currentMinistry === 'Ancionato/Diretoria' || currentRole === 'Ancião(a)') roleMapName = 'Ancião';
    if (currentMinistry === 'Diaconato') roleMapName = 'Diácono';
    if (currentMinistry === 'Diaconisas') roleMapName = 'Diaconisa';
    if (currentMinistry === 'Ministério da Música' && currentRole === 'Equipe de louvor') roleMapName = 'Cantor(a) Congregacional'; // Default
    if (currentMinistry === 'Sonoplastia') roleMapName = 'Sonoplasta';
    if (currentMinistry === 'Secretaria') roleMapName = 'Secretaria';
    if (currentMinistry === 'Escola Sabatina' && currentRole.includes('Professor')) roleMapName = 'Professor da Escola Sabatina';
    if (currentRole.includes('Diretor')) roleMapName = 'Diretor';
    
    if (roleMapName) {
       const roleObj = roles?.find(r => r.name === roleMapName);
       if (roleObj) {
          const { data: existingRole } = await supabase.from('person_roles').select('id').eq('person_id', personId).eq('role_id', roleObj.id).maybeSingle();
          if (!existingRole) {
             await supabase.from('person_roles').insert({ person_id: personId, role_id: roleObj.id });
          }
       }
    }
    
    // 3. Link Ministry
    // We try to match currentMinistry to our database ministries
    const minMatch = ministries?.find(m => m.name.toLowerCase() === currentMinistry.toLowerCase() || currentMinistry.toLowerCase().includes(m.name.toLowerCase()));
    if (minMatch) {
       const { data: existingMin } = await supabase.from('person_ministries').select('id').eq('person_id', personId).eq('ministry_id', minMatch.id).maybeSingle();
       if (!existingMin) {
          await supabase.from('person_ministries').insert({ person_id: personId, ministry_id: minMatch.id });
       }
    }
  }
  
  console.log("Done seeding!");
}

seed().catch(console.error);
