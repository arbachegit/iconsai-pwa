/**
 * Dados de exemplo (seed data) para modo demonstração
 * Conversas realistas para mostrar funcionalidades dos PWAs
 */

// Tipos
export interface DemoConversation {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  audioUrl?: string | null;
}

export interface DemoMessage {
  role: "user" | "assistant";
  content: string;
}

// ============================================
// PWA PRINCIPAL (KNOWYOU) - 5 CONVERSAS
// ============================================
export const PWA_SEED_DATA: DemoConversation[] = [
  // Conversa 1: Introdução
  {
    role: "user",
    content: "Olá! Como funciona o KnowYOU?",
    timestamp: "2026-01-17T10:00:00Z",
  },
  {
    role: "assistant",
    content: "Olá! Sou o KnowYOU, seu assistente pessoal de voz. Posso ajudar você em 4 áreas: Ajuda (informações gerais), Mundo (notícias e curiosidades), Saúde (orientações médicas básicas) e Ideias (brainstorming e criatividade). Como posso te ajudar hoje?",
    timestamp: "2026-01-17T10:00:05Z",
  },

  // Conversa 2: Notícias
  {
    role: "user",
    content: "Quais são as principais notícias de hoje?",
    timestamp: "2026-01-17T10:05:00Z",
  },
  {
    role: "assistant",
    content: "Aqui estão os destaques de hoje:\n\n🌎 Brasil: Governo anuncia novo pacote de investimentos em infraestrutura\n🌍 Mundo: Avanços na tecnologia de energia solar batem recorde\n💼 Economia: Dólar fecha em queda, bolsa sobe 1.2%\n⚽ Esportes: Seleção brasileira vence amistoso\n\nQuer detalhes sobre algum tema?",
    timestamp: "2026-01-17T10:05:08Z",
  },

  // Conversa 3: Saúde
  {
    role: "user",
    content: "Quantas horas de sono eu preciso?",
    timestamp: "2026-01-17T10:10:00Z",
  },
  {
    role: "assistant",
    content: "A quantidade ideal varia por idade:\n\n👶 Bebês (4-11 meses): 12-15 horas\n🧒 Crianças (6-13 anos): 9-11 horas\n👦 Adolescentes (14-17 anos): 8-10 horas\n👨 Adultos (18-64 anos): 7-9 horas\n👴 Idosos (65+): 7-8 horas\n\nA qualidade do sono é tão importante quanto a quantidade!",
    timestamp: "2026-01-17T10:10:06Z",
  },

  // Conversa 4: Ideias
  {
    role: "user",
    content: "Me dê ideias para presente de aniversário",
    timestamp: "2026-01-17T10:15:00Z",
  },
  {
    role: "assistant",
    content: "Claro! Aqui estão algumas sugestões criativas:\n\n🎁 Experiências:\n- Jantar em restaurante especial\n- Curso online do interesse da pessoa\n- Spa day\n\n🎨 Personalizados:\n- Álbum de fotos customizado\n- Caneca/camiseta com arte exclusiva\n- Playlist personalizada\n\n📚 Práticos:\n- Livro do autor favorito\n- Gadget tech\n- Kit de hobby (jardinagem, culinária, etc.)\n\nQuer mais ideias em alguma categoria?",
    timestamp: "2026-01-17T10:15:09Z",
  },

  // Conversa 5: Ajuda Geral
  {
    role: "user",
    content: "Como está o tempo hoje?",
    timestamp: "2026-01-17T10:20:00Z",
  },
  {
    role: "assistant",
    content: "Baseado na sua localização:\n\n☀️ Temperatura: 28°C\n🌤️ Condição: Parcialmente nublado\n💧 Umidade: 65%\n💨 Vento: 15 km/h\n\nPrevisão para tarde: Possibilidade de chuva leve às 17h. Leve um guarda-chuva!",
    timestamp: "2026-01-17T10:20:04Z",
  },
];

// ============================================
// PWA CITY (CHAT IA) - 4 CONVERSAS
// ============================================
export const PWACITY_SEED_DATA: DemoMessage[] = [
  // Conversa 1: Criatividade
  {
    role: "user",
    content: "Escreva um poema curto sobre tecnologia",
  },
  {
    role: "assistant",
    content: "**Bits e Bytes**\n\nNos circuitos da mente digital,\nPulsa vida em código binário.\nConexões que cruzam o global,\nTransformando o extraordinário.\n\nTela brilha, mundo na mão,\nFuturo e presente em união.\nTecnologia, nossa criação,\nFerramenta da evolução.",
  },

  // Conversa 2: Produtividade
  {
    role: "user",
    content: "Me ajude a organizar minha rotina matinal",
  },
  {
    role: "assistant",
    content: "Aqui está uma rotina matinal otimizada:\n\n**6:00** - Acordar (sem soneca!)\n**6:05** - Hidratação (copo d'água)\n**6:10** - Alongamento leve (5 min)\n**6:15** - Banho revigorante\n**6:30** - Café da manhã nutritivo\n**6:50** - Revisar agenda do dia\n**7:00** - Primeira tarefa importante\n\n💡 Dica: Evite celular nos primeiros 30 min\n💡 Prepare roupa e materiais na noite anterior",
  },

  // Conversa 3: Aprendizado
  {
    role: "user",
    content: "Explique blockchain de forma simples",
  },
  {
    role: "assistant",
    content: "Blockchain é como um caderno compartilhado que ninguém pode apagar:\n\n📖 **Analogia:**\nImagine um caderno onde cada página é uma \"transação\". Quando a página fica cheia, você cola ela na anterior. Agora, esse caderno está com centenas de pessoas ao mesmo tempo. Se alguém tentar mudar uma página antiga, todos notam porque têm a cópia original.\n\n🔐 **Características:**\n- Descentralizado (sem dono único)\n- Imutável (não pode ser alterado)\n- Transparente (todos veem)\n\n💰 **Usos:**\nCriptomoedas, contratos inteligentes, rastreamento de produtos.",
  },

  // Conversa 4: Planejamento
  {
    role: "user",
    content: "Crie um plano de estudos para aprender Python",
  },
  {
    role: "assistant",
    content: "**Plano de 4 Semanas - Python para Iniciantes**\n\n**Semana 1: Fundamentos**\n- Sintaxe básica\n- Variáveis e tipos de dados\n- Operadores e estruturas condicionais\n- Loops (for, while)\n\n**Semana 2: Estruturas de Dados**\n- Listas, tuplas, dicionários\n- Strings e manipulação\n- Funções\n- Escopo de variáveis\n\n**Semana 3: Orientação a Objetos**\n- Classes e objetos\n- Herança\n- Métodos especiais\n- Projeto prático: Sistema de cadastro\n\n**Semana 4: Bibliotecas e Projeto**\n- Pandas (dados)\n- Requests (web)\n- Projeto final: Web scraper\n\n⏰ Estude 1h por dia\n💻 Pratique no Replit ou VSCode",
  },
];

// ============================================
// PWA HEALTH (SAÚDE) - 3 CONVERSAS
// ============================================
export const PWAHEALTH_SEED_DATA: DemoMessage[] = [
  // Conversa 1: Triagem Leve
  {
    role: "user",
    content: "Estou com tosse há 3 dias, mas sem febre",
  },
  {
    role: "assistant",
    content: "Vou fazer uma avaliação rápida:\n\n**Sintomas Reportados:**\n✓ Tosse há 3 dias\n✓ Sem febre\n\n**Perguntas Complementares:**\n- A tosse é seca ou com catarro?\n- Tem dor no peito ao tossir?\n- Falta de ar?\n- Contato com pessoas doentes?\n\nEnquanto aguardo suas respostas, algumas orientações gerais:\n💧 Mantenha hidratação\n🍯 Mel com limão pode aliviar\n🌡️ Monitore temperatura 2x ao dia",
  },
  {
    role: "user",
    content: "Tosse seca, sem dor no peito, sem falta de ar, sem contato com doentes",
  },
  {
    role: "assistant",
    content: "**Avaliação Inicial:**\n\n🟢 **Classificação: Baixa Gravidade**\n\nBaseado nos sintomas, parece ser uma irritação respiratória leve, possivelmente causada por:\n- Ar seco\n- Alergia\n- Irritação por poluição\n\n**Orientações:**\n✓ Umidificar ambiente\n✓ Evitar irritantes (fumaça, perfumes fortes)\n✓ Manter hidratação (2L água/dia)\n✓ Chá morno com mel\n\n**Quando procurar médico:**\n⚠️ Se tosse piorar ou durar mais de 7 dias\n⚠️ Se aparecer febre\n⚠️ Se surgirem dor no peito ou falta de ar\n\n**Status:** Autocuidado recomendado",
  },

  // Conversa 2: Prevenção
  {
    role: "user",
    content: "Como prevenir gripes e resfriados?",
  },
  {
    role: "assistant",
    content: "**Guia de Prevenção - Gripes e Resfriados**\n\n🧼 **Higiene:**\n- Lavar mãos frequentemente (20 segundos)\n- Álcool gel quando não tiver água\n- Evitar tocar olhos, nariz e boca\n\n💪 **Fortalecimento:**\n- Alimentação balanceada (frutas, vegetais)\n- Vitamina C (laranja, acerola, kiwi)\n- Dormir 7-8 horas por noite\n- Exercícios regulares\n\n🏠 **Ambiente:**\n- Manter ambientes ventilados\n- Evitar aglomerações em épocas de surto\n- Limpar superfícies frequentemente\n\n💉 **Vacinação:**\n- Vacina da gripe anualmente (março-maio)\n\n🚨 **Se Adoecer:**\n- Ficar em casa\n- Usar máscara ao sair\n- Cobrir boca ao tossir/espirrar",
  },

  // Conversa 3: Emergência
  {
    role: "user",
    content: "Dor forte no peito do lado esquerdo",
  },
  {
    role: "assistant",
    content: "🚨 **ATENÇÃO: SINTOMA DE ALERTA**\n\n**Perguntas URGENTES:**\n1. A dor irradia para braço, mandíbula ou costas?\n2. Tem falta de ar?\n3. Sudorese intensa?\n4. Náusea ou vômito?\n5. Tontura?\n\n**AÇÃO IMEDIATA RECOMENDADA:**\n\n🚑 Ligue 192 (SAMU) ou vá ao Pronto Socorro AGORA se:\n- Qualquer uma das perguntas acima for SIM\n- Dor muito intensa (>7/10)\n- Começou subitamente\n\n⏱️ Enquanto aguarda ajuda:\n- Sente-se ou deite\n- Afrouxe roupas apertadas\n- NÃO dirija sozinho\n- Tenha alguém por perto\n\n**Classificação:** 🔴 EMERGÊNCIA POTENCIAL\n\n**Não minimize sintomas de dor no peito. Procure atendimento médico imediato.**",
  },
];
