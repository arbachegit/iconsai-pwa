import { useState, useEffect, useCallback } from 'react';
import { DebouncedInput } from "@/components/ui/debounced-input";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Newspaper, RefreshCw, ExternalLink, Search, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  sentiment_score: number | null;
  created_at: string;
}

const SOURCES = ['Todos', 'CNN Brasil', 'InfoMoney', 'SBVC', 'Valor Econômico'];

export default function MarketNewsTab() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('Todos');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('market_news')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Erro ao carregar notícias');
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeNews = async () => {
    setScraping(true);
    try {
      const response = await supabase.functions.invoke('scrape-retail-news');
      
      if (response.error) throw response.error;

      toast.success(`Notícias atualizadas: ${response.data?.newsCount || 0} novas`);
      fetchNews();
    } catch (error) {
      console.error('Error scraping news:', error);
      toast.error('Erro ao buscar notícias');
    } finally {
      setScraping(false);
    }
  };

  const getSentimentIcon = (score: number | null) => {
    if (score === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (score > 0.2) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (score < -0.2) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-amber-500" />;
  };

  const getSentimentLabel = (score: number | null) => {
    if (score === null) return 'Neutro';
    if (score > 0.2) return 'Positivo';
    if (score < -0.2) return 'Negativo';
    return 'Neutro';
  };

  const getSentimentColor = (score: number | null) => {
    if (score === null) return 'bg-muted text-muted-foreground';
    if (score > 0.2) return 'bg-green-500/20 text-green-400 border-green-500/40';
    if (score < -0.2) return 'bg-red-500/20 text-red-400 border-red-500/40';
    return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'CNN Brasil': 'bg-red-500/20 text-red-400 border-red-500/40',
      'InfoMoney': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      'SBVC': 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      'Valor Econômico': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      'Exame': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    };
    return colors[source] || 'bg-muted text-muted-foreground';
  };

  const filteredNews = news.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'Todos' || item.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const stats = {
    total: news.length,
    positive: news.filter(n => n.sentiment_score && n.sentiment_score > 0.2).length,
    negative: news.filter(n => n.sentiment_score && n.sentiment_score < -0.2).length,
    neutral: news.filter(n => !n.sentiment_score || (n.sentiment_score >= -0.2 && n.sentiment_score <= 0.2)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Balcão de Notícias</h2>
        </div>
        <Button
          onClick={handleScrapeNews}
          disabled={scraping}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${scraping ? 'animate-spin' : ''}`} />
          Atualizar Feed
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total de Notícias</div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-500">{stats.positive}</div>
            <div className="text-xs text-muted-foreground">Positivas</div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-500">{stats.neutral}</div>
            <div className="text-xs text-muted-foreground">Neutras</div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-500">{stats.negative}</div>
            <div className="text-xs text-muted-foreground">Negativas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/40 bg-card/50">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <DebouncedInput
                placeholder="Buscar notícias..."
                value={searchTerm}
                onChange={setSearchTerm}
                delay={300}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por fonte" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* News Feed */}
      <div className="space-y-3">
        {filteredNews.length === 0 ? (
          <Card className="border-border/40 bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma notícia encontrada</p>
              <p className="text-sm">Clique em "Atualizar Feed" para buscar notícias</p>
            </CardContent>
          </Card>
        ) : (
          filteredNews.map((item) => (
            <Card key={item.id} className="border-border/40 bg-card/50 hover:bg-card/80 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary transition-colors line-clamp-2"
                    >
                      {item.title}
                    </a>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <Badge variant="outline" className={getSourceColor(item.source)}>
                        {item.source}
                      </Badge>
                      <Badge variant="outline" className={getSentimentColor(item.sentiment_score)}>
                        {getSentimentIcon(item.sentiment_score)}
                        <span className="ml-1">{getSentimentLabel(item.sentiment_score)}</span>
                      </Badge>
                      {item.published_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
