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
