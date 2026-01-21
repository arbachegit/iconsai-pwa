// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// RSS Feed sources for Brazilian retail/economic news
const RSS_FEEDS = [
  { name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/economia/feed/' },
  { name: 'InfoMoney', url: 'https://www.infomoney.com.br/feed/' },
  { name: 'Valor Econômico', url: 'https://valor.globo.com/rss/economia' },
  { name: 'SBVC', url: 'https://sbvc.com.br/feed/' },
];

// Enhanced sentiment keywords for better analysis
const POSITIVE_KEYWORDS = [
  'crescimento', 'alta', 'aumento', 'lucro', 'ganho', 'recorde', 'otimismo',
  'recuperação', 'expansão', 'positivo', 'melhora', 'sucesso', 'valorização',
  'superávit', 'investimento', 'emprego', 'contratação', 'aquecimento', 'impulso'
];

const NEGATIVE_KEYWORDS = [
  'queda', 'baixa', 'perda', 'crise', 'inflação', 'recessão', 'desemprego',
  'déficit', 'prejuízo', 'negativo', 'risco', 'colapso', 'falência', 'demissão',
  'retração', 'estagnação', 'endividamento', 'calote', 'inadimplência', 'escassez'
];

function calculateSentiment(title: string): number {
  const lowerTitle = title.toLowerCase();
  let score = 0;
  
  POSITIVE_KEYWORDS.forEach(word => {
    if (lowerTitle.includes(word)) score += 0.15;
  });
  
  NEGATIVE_KEYWORDS.forEach(word => {
    if (lowerTitle.includes(word)) score -= 0.15;
  });
  
  // Clamp between -1 and 1
  return Math.max(-1, Math.min(1, score));
}

function parseRSSDate(dateString: string): string | null {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

function extractItemsFromRSS(xml: string, sourceName: string): Array<{
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  sentiment_score: number;
}> {
  const items: Array<{
    title: string;
    url: string;
    source: string;
    published_at: string | null;
    sentiment_score: number;
  }> = [];

  // Simple XML parsing for RSS items
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  
  for (const itemXml of itemMatches.slice(0, 25)) { // Limit to 25 items per feed
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>|<link>(.*?)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);

    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : null;
    const url = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : null;
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : null;

    if (title && url) {
      items.push({
        title,
        url,
        source: sourceName,
        published_at: pubDate ? parseRSSDate(pubDate) : null,
        sentiment_score: calculateSentiment(title),
      });
    }
  }

  return items;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[SCRAPE-NEWS] Starting news scrape...');

    const allNews: Array<{
      title: string;
      url: string;
      source: string;
      published_at: string | null;
      sentiment_score: number;
    }> = [];

    for (const feed of RSS_FEEDS) {
      try {
        console.log(`[SCRAPE-NEWS] Fetching ${feed.name}...`);
        
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KnowYOU/1.0; +https://knowyou.app)',
            'Accept': 'application/rss+xml, application/xml, text/xml',
          },
        });

        if (!response.ok) {
          console.error(`[SCRAPE-NEWS] Failed to fetch ${feed.name}: ${response.status}`);
          continue;
        }

        const xml = await response.text();
        const items = extractItemsFromRSS(xml, feed.name);
        allNews.push(...items);
        
        console.log(`[SCRAPE-NEWS] Extracted ${items.length} items from ${feed.name}`);
      } catch (err) {
        console.error(`[SCRAPE-NEWS] Error fetching ${feed.name}:`, err);
      }
    }

    if (allNews.length === 0) {
      return new Response(
        JSON.stringify({ success: true, newsCount: 0, message: 'No news fetched' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert news (ignore duplicates based on URL)
    const { error: insertError } = await supabase
      .from('market_news')
      .upsert(allNews, { 
        onConflict: 'url',
        ignoreDuplicates: true 
      });

    if (insertError) {
      console.error('[SCRAPE-NEWS] Insert error:', insertError);
      throw insertError;
    }

    // Log to audit
    await supabase.from('user_activity_logs').insert({
      user_email: 'system@knowyou.app',
      action_category: 'NEWS_SCRAPE',
      action: `Scraped retail news | Total: ${allNews.length} items from ${RSS_FEEDS.length} sources`,
      details: { 
        sources: RSS_FEEDS.map(f => f.name),
        totalItems: allNews.length 
      }
    });

    console.log(`[SCRAPE-NEWS] Complete. Inserted ${allNews.length} news items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newsCount: allNews.length,
        sources: RSS_FEEDS.map(f => f.name)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SCRAPE-NEWS] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
