const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Carregar configurações
const configPath = path.join(__dirname, 'config.json');
let config = { API_URL: '' };
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Arquivo de histórico para evitar mensagens duplicadas
const historicoPath = path.join(__dirname, 'historico.json');

function carregarHistorico() {
  if (fs.existsSync(historicoPath)) {
    return JSON.parse(fs.readFileSync(historicoPath, 'utf8'));
  }
  return [];
}

function salvarHistorico(historico) {
  fs.writeFileSync(historicoPath, JSON.stringify(historico, null, 2), 'utf8');
}

// Formatar número de telefone para o padrão do WhatsApp (com @c.us)
function formatarNumero(numero) {
  // Remove tudo que não for número
  let limpo = numero.replace(/\D/g, '');
  
  // Se começar com 0, remove (ex: 05199999999 -> 5199999999)
  if (limpo.startsWith('0')) limpo = limpo.substring(1);
  
  // Garante que tem o código do Brasil se não tiver
  if (limpo.length <= 11) limpo = '55' + limpo;
  
  return `${limpo}@c.us`;
}

// Iniciar Cliente do WhatsApp
console.log('🤖 Iniciando o Robô da Agenda Igreja...');
console.log('⏳ Por favor, aguarde...');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('\n=========================================');
  console.log('📱 ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP');
  console.log('Vá em: Configurações > Aparelhos Conectados > Conectar um aparelho');
  console.log('=========================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
  console.log('\n[✅] Robô conectado ao WhatsApp com sucesso!');
  
  if (!config.API_URL || config.API_URL.includes('COLOQUE_SUA_URL_DO_VERCEL_AQUI')) {
    console.log('\n[⚠️] ERRO: Você esqueceu de colocar a URL do seu site no arquivo config.json!');
    console.log('[⚠️] Por favor, edite o arquivo whatsapp-bot/config.json e coloque a URL.');
    process.exit(1);
  }

  await processarEscalas();
  
  console.log('\n[💤] Tarefa concluída! O robô pode ser fechado ou deixado aberto.');
  console.log('     Se você deixar a janela aberta, amanhã você pode apenas dar um "Ctrl+C" e rodar de novo.');
  
  // Encerra o processo após 5 segundos para que a janela feche (se rodado pelo .bat)
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

client.on('auth_failure', msg => {
  console.error('[❌] Falha na autenticação:', msg);
});

async function processarEscalas() {
  console.log('\n[🔄] Buscando escalas pendentes no sistema...');
  
  try {
    const response = await axios.get(config.API_URL);
    const escalas = response.data;
    
    if (!escalas || escalas.length === 0) {
      console.log('[💤] Ninguém escalado para os próximos dias com WhatsApp cadastrado.');
      return;
    }

    console.log(`[📊] Encontrei ${escalas.length} escala(s). Verificando quem já foi avisado...`);
    
    const historico = carregarHistorico();
    let mensagensEnviadas = 0;

    for (const escala of escalas) {
      // Cria um ID único para esse envio (Ex: 555199999999_2026-08-20_Culto_Pregador)
      const idEnvio = `${escala.whatsapp}_${escala.data}_${escala.evento}_${escala.funcao}`;
      
      if (historico.includes(idEnvio)) {
        // Já enviou, pula
        continue;
      }

      // Prepara a mensagem
      const dataFormatada = escala.data.split('-').reverse().join('/');
      const msg = `Olá *${escala.nome}*! A Paz do Senhor!\n\nEste é um lembrete automático da secretaria da igreja.\nVocê está escalado(a) como *${escala.funcao}* no *${escala.evento}* do dia *${dataFormatada}* às *${escala.horario}*.\n\nQue Deus abençoe seu ministério! 🙏`;

      try {
        const chat_id = formatarNumero(escala.whatsapp);
        await client.sendMessage(chat_id, msg);
        console.log(`[✉️] Enviado para ${escala.nome} (${escala.funcao})`);
        
        // Registra no histórico para não enviar de novo amanhã
        historico.push(idEnvio);
        salvarHistorico(historico);
        mensagensEnviadas++;
        
        // Pausa de 2 segundos entre mensagens para evitar bloqueio do WhatsApp
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`[❌] Erro ao enviar para ${escala.nome}:`, err.message);
      }
    }

    if (mensagensEnviadas === 0) {
      console.log('[💤] Todos já haviam sido avisados. Nenhuma mensagem nova enviada.');
    } else {
      console.log(`\n[✅] Finalizado! ${mensagensEnviadas} nova(s) mensagem(ns) enviada(s).`);
    }

  } catch (error) {
    console.error('[❌] Erro ao buscar dados do site:', error.message);
  }
}

client.initialize();
