import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image as ImageIcon, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

const SECTIONS = [
  { id: 'software', name: 'Software - A Primeira Revolução' },
  { id: 'internet', name: 'Internet - A Era da Conectividade' },
  { id: 'tech-sem-proposito', name: 'Tech Sem Propósito - O Hype' },
  { id: 'kubrick', name: 'Kubrick - A Profecia de 1968' },
  { id: 'watson', name: 'Watson - A Era da Cognição' },
  { id: 'ia-nova-era', name: 'Nova Era da IA' },
  { id: 'bom-prompt', name: 'Bom Prompt - A Arte da Comunicação' },
  { id: 'knowyou', name: 'KnowYOU - Assistente de Saúde' },
  { id: 'digital-exclusion', name: '5,74 Bilhões - Exclusão Digital' },
];

const TIMELINE_EVENTS = [
  { id: 'talos', name: 'Talos - Gigante de Bronze' },
  { id: 'telegraphy-cards', name: 'Telegrafia e Cartões Perfurados' },
  { id: 'turing-machine', name: 'Máquina de Turing' },
  { id: 'enigma', name: 'Quebra do Código Enigma' },
  { id: 'turing-test', name: 'Teste de Turing' },
  { id: 'arpanet', name: 'ARPANET - Primeira Conexão' },
  { id: 'tcpip', name: 'Conceito de TCP/IP' },
  { id: 'www', name: 'World Wide Web' },
  { id: 'social', name: 'Facebook e Orkut - Web 2.0' },
  { id: 'watson', name: 'IBM Watson vence Jeopardy!' },
  { id: 'openai', name: 'Fundação da OpenAI' },
  { id: 'gpt3', name: 'Lançamento do GPT-3' },
  { id: 'chatgpt', name: 'Lançamento do ChatGPT' },
  { id: 'current', name: 'Web 3.0, Veo e LLMs' },
];

export const ImageCacheTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [generatingTimeline, setGeneratingTimeline] = useState<string | null>(null);
  const [generatingTooltip, setGeneratingTooltip] = useState<string | null>(null);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isTooltipsOpen, setIsTooltipsOpen] = useState(false);
  const [optimizingImage, setOptimizingImage] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ 
    url: string; 
    title: string; 
    category: 'sections' | 'timeline' | 'tooltips';
    index: number;
  } | null>(null);

  const { data: existingImages } = useQuery({
    queryKey: ['section-images-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('generated_images')
        .select('section_id, image_url, created_at')
        .in('section_id', SECTIONS.map(s => s.id))
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: timelineImages } = useQuery({
    queryKey: ['timeline-images-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('generated_images')
        .select('section_id, image_url, created_at')
        .like('section_id', 'history-%')
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: tooltipImages } = useQuery({
    queryKey: ['tooltip-images-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('generated_images')
        .select('section_id, image_url, created_at')
        .in('section_id', ['tooltip-software', 'tooltip-internet', 'tooltip-tech-sem-proposito', 'tooltip-kubrick', 'tooltip-watson', 'tooltip-ia-nova-era', 'tooltip-bom-prompt', 'tooltip-knowyou'])
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const generateTimelineImageMutation = useMutation({
    mutationFn: async ({ eraId, forceRegenerate }: { eraId: string; forceRegenerate: boolean }) => {
      setGeneratingTimeline(eraId);
      
      const { data, error } = await supabase.functions.invoke('generate-history-image', {
        body: { eraId, forceRegenerate }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('Nenhuma imagem retornada');

      return data.imageUrl;
    },
    onSuccess: (_, { eraId }) => {
      toast({
        title: "Imagem gerada com sucesso",
        description: `Imagem do evento ${eraId} foi gerada e salva.`,
      });
      queryClient.invalidateQueries({ queryKey: ['timeline-images-admin'] });
      setGeneratingTimeline(null);
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao gerar imagem';
      
      if (error.message?.includes('402')) {
        errorMessage = 'Créditos insuficientes. Adicione créditos ao workspace.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setGeneratingTimeline(null);
    }
  });

  const deleteTimelineImageMutation = useMutation({
    mutationFn: async (eraId: string) => {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('section_id', `history-${eraId}`);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cache limpo",
        description: "Imagem removida do cache.",
      });
      queryClient.invalidateQueries({ queryKey: ['timeline-images-admin'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao limpar cache",
        variant: "destructive",
      });
    }
  });

  const generateImageMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      setGeneratingSection(sectionId);
      
      const { data, error } = await supabase.functions.invoke('generate-section-image', {
        body: { section_id: sectionId }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('Nenhuma imagem retornada');

      // Save to database
      const { error: dbError } = await supabase
        .from('generated_images')
        .upsert({
          section_id: sectionId,
          image_url: data.imageUrl,
          prompt_key: sectionId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'prompt_key' });

      if (dbError) throw dbError;

      return data.imageUrl;
    },
    onSuccess: (_, sectionId) => {
      toast({
        title: "Imagem gerada com sucesso",
        description: `Imagem da seção ${sectionId} foi gerada e salva.`,
      });
      queryClient.invalidateQueries({ queryKey: ['section-images-admin'] });
      queryClient.invalidateQueries({ queryKey: ['section-image'] });
      setGeneratingSection(null);
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao gerar imagem';
      
      if (error.message?.includes('402')) {
        errorMessage = 'Créditos insuficientes. Adicione créditos ao workspace.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setGeneratingSection(null);
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('section_id', sectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cache limpo",
        description: "Imagem removida do cache.",
      });
      queryClient.invalidateQueries({ queryKey: ['section-images-admin'] });
      queryClient.invalidateQueries({ queryKey: ['section-image'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao limpar cache",
        variant: "destructive",
      });
    }
  });

  const [isMigrating, setIsMigrating] = useState(false);

  const migrateTimelineImagesMutation = useMutation({
    mutationFn: async () => {
      setIsMigrating(true);
      const { data, error } = await supabase.functions.invoke('migrate-timeline-images', {
        body: {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsMigrating(false);
      toast({
        title: "Migração concluída",
        description: `${data.migrated} imagens migradas para WebP no Storage. ${data.failed} falhas.`,
      });
      queryClient.invalidateQueries({ queryKey: ['timeline-images'] });
    },
    onError: (error: Error) => {
      setIsMigrating(false);
      toast({
        title: "Erro na migração",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const migrateAllImagesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('migrate-all-images');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Migração de todas as imagens concluída",
        description: `${data.migrated} imagens migradas com sucesso. ${data.failed} falharam. ${data.skipped} já estavam migradas.`,
      });
      queryClient.invalidateQueries({ queryKey: ['generated-images'] });
      queryClient.invalidateQueries({ queryKey: ['section-images-admin'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na migração",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const optimizeImageMutation = useMutation({
    mutationFn: async ({ sectionId, bucket }: { sectionId: string; bucket: 'timeline-images' | 'content-images' }) => {
      const { data: image } = await supabase
        .from('generated_images')
        .select('image_url')
        .eq('section_id', sectionId)
        .single();

      if (!image?.image_url || !image.image_url.startsWith('data:image')) {
        throw new Error('Imagem já está otimizada ou não existe');
      }

      const base64Data = image.image_url.replace(/^data:image\/\w+;base64,/, '');
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const fileName = `${sectionId}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, bytes, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('generated_images')
        .update({ 
          image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('section_id', sectionId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      toast({
        title: "Imagem otimizada",
        description: "Imagem convertida para WebP e salva no Storage.",
      });
      queryClient.invalidateQueries({ queryKey: ['section-images-admin'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-images-admin'] });
      queryClient.invalidateQueries({ queryKey: ['tooltip-images-admin'] });
      setOptimizingImage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na otimização",
        description: error.message,
        variant: "destructive",
      });
      setOptimizingImage(null);
    }
  });

  // Criar lista unificada de todas as imagens para navegação
  const getAllImages = useCallback(() => {
    const images: Array<{ url: string; title: string; category: 'sections' | 'timeline' | 'tooltips' }> = [];
    
    // Imagens das seções
    SECTIONS.forEach(section => {
      const img = existingImages?.find(i => i.section_id === section.id);
      if (img) {
        images.push({ url: img.image_url, title: section.name, category: 'sections' });
      }
    });
    
    // Imagens da timeline
    TIMELINE_EVENTS.forEach(event => {
      const img = timelineImages?.find(i => i.section_id === `history-${event.id}`);
      if (img) {
        images.push({ url: img.image_url, title: event.name, category: 'timeline' });
      }
    });
    
    // Imagens dos tooltips
    SECTIONS.slice(0, -1).forEach(section => {
      const img = tooltipImages?.find(i => i.section_id === `tooltip-${section.id}`);
      if (img) {
        images.push({ url: img.image_url, title: `${section.name} - Tooltip`, category: 'tooltips' });
      }
    });
    
    return images;
  }, [existingImages, timelineImages, tooltipImages]);

  const allImages = getAllImages();

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (!zoomImage) return;
    
    const currentIndex = allImages.findIndex(
      img => img.url === zoomImage.url && img.title === zoomImage.title
    );
    
    if (currentIndex === -1) return;
    
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
    } else {
      newIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
    }
    
    const newImage = allImages[newIndex];
    setZoomImage({ ...newImage, index: newIndex });
  }, [zoomImage, allImages]);

  const handleDownload = async () => {
    if (!zoomImage) return;
    
    try {
      const response = await fetch(zoomImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${zoomImage.title.replace(/[^a-zA-Z0-9]/g, '-')}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível baixar a imagem",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!zoomImage) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateImage('next');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomImage, navigateImage]);

  const getSectionImage = (sectionId: string) => {
    return existingImages?.find(img => img.section_id === sectionId);
  };

  const getTimelineImage = (eraId: string) => {
    return timelineImages?.find(img => img.section_id === `history-${eraId}`);
  };

  const getTooltipImage = (sectionId: string) => {
    return tooltipImages?.find(img => img.section_id === `tooltip-${sectionId}`);
  };

  const getImageAuditInfo = (imageUrl: string) => {
    const isBase64 = imageUrl.startsWith('data:image');
    const isStorageUrl = imageUrl.includes('supabase.co/storage');
    
    if (isBase64) {
      const sizeKB = Math.round(imageUrl.length * 0.75 / 1024);
      return {
        storageType: '⚠️ Base64 (não otimizada)',
        isOptimized: false,
        sizeMB: (sizeKB / 1024).toFixed(2),
        potentialSavings: Math.round(sizeKB * 0.7 / 1024 * 10) / 10,
        status: '🔴 Requer migração'
      };
    }
    
    return {
      storageType: '✅ WebP no Storage',
      isOptimized: true,
      sizeMB: '~0.15',
      potentialSavings: 0,
      status: '🟢 Otimizada'
    };
  };

  const generateTooltipImageMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      setGeneratingTooltip(sectionId);
      
      const { data, error } = await supabase.functions.invoke('generate-section-image', {
        body: { section_id: `tooltip-${sectionId}` }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('Nenhuma imagem retornada');

      const { error: dbError } = await supabase
        .from('generated_images')
        .upsert({
          section_id: `tooltip-${sectionId}`,
          image_url: data.imageUrl,
          prompt_key: `tooltip-${sectionId}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'prompt_key' });

      if (dbError) throw dbError;

      return data.imageUrl;
    },
    onSuccess: (_, sectionId) => {
      toast({
        title: "Imagem gerada com sucesso",
        description: `Imagem do tooltip ${sectionId} foi gerada e salva.`,
      });
      queryClient.invalidateQueries({ queryKey: ['tooltip-images-admin'] });
      setGeneratingTooltip(null);
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao gerar imagem';
      
      if (error.message?.includes('402')) {
        errorMessage = 'Créditos insuficientes. Adicione créditos ao workspace.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setGeneratingTooltip(null);
    }
  });

  const deleteTooltipImageMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('section_id', `tooltip-${sectionId}`);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cache limpo",
        description: "Imagem removida do cache.",
      });
      queryClient.invalidateQueries({ queryKey: ['tooltip-images-admin'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao limpar cache",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Migration Alert - Timeline */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <ImageIcon className="h-5 w-5" />
            Otimização de Imagens da Timeline
          </CardTitle>
          <CardDescription>
            Migre as imagens Base64 (~43 MB) para WebP otimizado no Storage (~1-2 MB total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => migrateTimelineImagesMutation.mutate()}
            disabled={isMigrating}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isMigrating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : (
              'Executar Migração para WebP + Storage'
            )}
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta operação irá converter todas as 19 imagens da timeline para WebP e armazená-las no Supabase Storage.
          </p>
        </CardContent>
      </Card>

      {/* Migration Alert - All Images */}
      <Card className="border-purple-500/50 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <ImageIcon className="h-5 w-5" />
            Otimização de Todas as Imagens
          </CardTitle>
          <CardDescription>
            Migre TODAS as imagens de seções e tooltips para WebP no Storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <p className="text-sm font-semibold mb-2">Esta migração processa:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• 8 imagens de seções do landing page</li>
                <li>• Todas as imagens de tooltips existentes</li>
                <li>• Ignora imagens da timeline (já migradas acima)</li>
                <li>• Economia total prevista: ~50 MB no banco</li>
              </ul>
            </div>
            
            <Button
              onClick={() => migrateAllImagesMutation.mutate()}
              disabled={migrateAllImagesMutation.isPending}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {migrateAllImagesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrando Todas...
                </>
              ) : (
                'Migrar Seções + Tooltips'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <AdminTitleWithInfo
                title="Gerenciamento de Imagens das Seções"
                level="h2"
                icon={ImageIcon}
                tooltipText="Gerencie imagens contextuais"
                infoContent={
                  <>
                    <p>Gere e gerencie imagens para cada seção do landing page.</p>
                    <p className="mt-2">Regenere imagens ou remova do cache quando necessário.</p>
                  </>
                }
              />
              <CardDescription className="mt-2">
                Gere e gerencie as imagens contextuais para cada seção do landing page
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSectionsOpen(!isSectionsOpen)}
              className="gap-2"
            >
              {isSectionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isSectionsOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
        </CardHeader>
        <Collapsible open={isSectionsOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {SECTIONS.map((section) => {
            const existingImage = getSectionImage(section.id);
            const isGenerating = generatingSection === section.id;

            return (
              <Card key={section.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="h-4 w-4" />
                      <h3 className="font-semibold">{section.name}</h3>
                    </div>
                    {existingImage ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Imagem gerada em: {new Date(existingImage.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        
                        {/* Área de Auditoria */}
                        <div className="p-3 border border-border/50 rounded-lg bg-muted/30 space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground">📊 AUDITORIA</p>
                          <div className="space-y-1 text-xs">
                            <p><span className="font-medium">Tipo:</span> {getImageAuditInfo(existingImage.image_url).storageType}</p>
                            <p><span className="font-medium">Tamanho:</span> {getImageAuditInfo(existingImage.image_url).sizeMB} MB</p>
                            {!getImageAuditInfo(existingImage.image_url).isOptimized && (
                              <p><span className="font-medium">Economia:</span> ~{getImageAuditInfo(existingImage.image_url).potentialSavings} MB (70%)</p>
                            )}
                            <p><span className="font-medium">Status:</span> {getImageAuditInfo(existingImage.image_url).status}</p>
                          </div>
                          {!getImageAuditInfo(existingImage.image_url).isOptimized && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setOptimizingImage(section.id);
                                optimizeImageMutation.mutate({ 
                                  sectionId: section.id, 
                                  bucket: 'content-images' 
                                });
                              }}
                              disabled={optimizingImage === section.id}
                              className="mt-2 w-full"
                            >
                              {optimizingImage === section.id ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Otimizando...
                                </>
                              ) : (
                                '⚡ Otimizar para WebP'
                              )}
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateImageMutation.mutate(section.id)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              'Regerar'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteImageMutation.mutate(section.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Nenhuma imagem gerada ainda
                        </p>
                        <Button
                          size="sm"
                          onClick={() => generateImageMutation.mutate(section.id)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            'Gerar Imagem'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {existingImage && (
                    <div 
                      className="w-24 h-24 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => {
                        const index = allImages.findIndex(img => img.title === section.name);
                        setZoomImage({ url: existingImage.image_url, title: section.name, category: 'sections', index });
                      }}
                    >
                      <img
                        src={existingImage.image_url}
                        alt={section.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Timeline History Images */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <AdminTitleWithInfo
                title="Imagens da Timeline Histórica"
                level="h2"
                icon={ImageIcon}
                tooltipText="Gerencie imagens da timeline de IA"
                infoContent={
                  <>
                    <p>Gere e gerencie imagens para eventos da timeline histórica da IA.</p>
                    <p className="mt-2">Forçar regeneração criará uma nova imagem mesmo se já existir no cache.</p>
                  </>
                }
              />
              <CardDescription className="mt-2">
                Gere e gerencie as imagens para cada evento da linha do tempo da história da IA
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTimelineOpen(!isTimelineOpen)}
              className="gap-2"
            >
              {isTimelineOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isTimelineOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
        </CardHeader>
        <Collapsible open={isTimelineOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {TIMELINE_EVENTS.map((event) => {
            const existingImage = getTimelineImage(event.id);
            const isGenerating = generatingTimeline === event.id;

            return (
              <Card key={event.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="h-4 w-4" />
                      <h3 className="font-semibold">{event.name}</h3>
                    </div>
                    {existingImage ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Imagem gerada em: {new Date(existingImage.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        
                        {/* Área de Auditoria */}
                        <div className="p-3 border border-border/50 rounded-lg bg-muted/30 space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground">📊 AUDITORIA</p>
                          <div className="space-y-1 text-xs">
                            <p><span className="font-medium">Tipo:</span> {getImageAuditInfo(existingImage.image_url).storageType}</p>
                            <p><span className="font-medium">Tamanho:</span> {getImageAuditInfo(existingImage.image_url).sizeMB} MB</p>
                            {!getImageAuditInfo(existingImage.image_url).isOptimized && (
                              <p><span className="font-medium">Economia:</span> ~{getImageAuditInfo(existingImage.image_url).potentialSavings} MB (70%)</p>
                            )}
                            <p><span className="font-medium">Status:</span> {getImageAuditInfo(existingImage.image_url).status}</p>
                          </div>
                          {!getImageAuditInfo(existingImage.image_url).isOptimized && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setOptimizingImage(`history-${event.id}`);
                                optimizeImageMutation.mutate({ 
                                  sectionId: `history-${event.id}`, 
                                  bucket: 'timeline-images' 
                                });
                              }}
                              disabled={optimizingImage === `history-${event.id}`}
                              className="mt-2 w-full"
                            >
                              {optimizingImage === `history-${event.id}` ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Otimizando...
                                </>
                              ) : (
                                '⚡ Otimizar para WebP'
                              )}
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateTimelineImageMutation.mutate({ eraId: event.id, forceRegenerate: true })}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              'Forçar Regeneração'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTimelineImageMutation.mutate(event.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Nenhuma imagem gerada ainda
                        </p>
                        <Button
                          size="sm"
                          onClick={() => generateTimelineImageMutation.mutate({ eraId: event.id, forceRegenerate: false })}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            'Gerar Imagem'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {existingImage && (
                    <div 
                      className="w-24 h-24 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => {
                        const index = allImages.findIndex(img => img.title === event.name);
                        setZoomImage({ url: existingImage.image_url, title: event.name, category: 'timeline', index });
                      }}
                    >
                      <img
                        src={existingImage.image_url}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Tooltip Images */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <AdminTitleWithInfo
                title="Gerenciamento de Imagens dos Tooltips"
                level="h2"
                icon={ImageIcon}
                tooltipText="Gerencie imagens dos tooltips"
                infoContent={
                  <>
                    <p>Gere e gerencie imagens para os tooltips de cada seção.</p>
                    <p className="mt-2">Regenere imagens ou remova do cache quando necessário.</p>
                  </>
                }
              />
              <CardDescription className="mt-2">
                Gere e gerencie as imagens contextuais para os tooltips das seções
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTooltipsOpen(!isTooltipsOpen)}
              className="gap-2"
            >
              {isTooltipsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isTooltipsOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
        </CardHeader>
        <Collapsible open={isTooltipsOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {SECTIONS.map((section) => {
                const existingImage = getTooltipImage(section.id);
                const isGenerating = generatingTooltip === section.id;

                return (
                  <Card key={section.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4" />
                          <h3 className="font-semibold">{section.name} - Tooltip</h3>
                        </div>
                        {existingImage ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Imagem gerada em: {new Date(existingImage.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            
                            {/* Área de Auditoria */}
                            <div className="p-3 border border-border/50 rounded-lg bg-muted/30 space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground">📊 AUDITORIA</p>
                              <div className="space-y-1 text-xs">
                                <p><span className="font-medium">Tipo:</span> {getImageAuditInfo(existingImage.image_url).storageType}</p>
                                <p><span className="font-medium">Tamanho:</span> {getImageAuditInfo(existingImage.image_url).sizeMB} MB</p>
                                {!getImageAuditInfo(existingImage.image_url).isOptimized && (
                                  <p><span className="font-medium">Economia:</span> ~{getImageAuditInfo(existingImage.image_url).potentialSavings} MB (70%)</p>
                                )}
                                <p><span className="font-medium">Status:</span> {getImageAuditInfo(existingImage.image_url).status}</p>
                              </div>
                              {!getImageAuditInfo(existingImage.image_url).isOptimized && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setOptimizingImage(`tooltip-${section.id}`);
                                    optimizeImageMutation.mutate({ 
                                      sectionId: `tooltip-${section.id}`, 
                                      bucket: 'content-images' 
                                    });
                                  }}
                                  disabled={optimizingImage === `tooltip-${section.id}`}
                                  className="mt-2 w-full"
                                >
                                  {optimizingImage === `tooltip-${section.id}` ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Otimizando...
                                    </>
                                  ) : (
                                    '⚡ Otimizar para WebP'
                                  )}
                                </Button>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateTooltipImageMutation.mutate(section.id)}
                                disabled={isGenerating}
                              >
                                {isGenerating ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Gerando...
                                  </>
                                ) : (
                                  'Regerar'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteTooltipImageMutation.mutate(section.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Nenhuma imagem gerada ainda
                            </p>
                            <Button
                              size="sm"
                              onClick={() => generateTooltipImageMutation.mutate(section.id)}
                              disabled={isGenerating}
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Gerando...
                                </>
                              ) : (
                                'Gerar Imagem'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      {existingImage && (
                        <div 
                          className="w-24 h-24 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => {
                            const title = `${section.name} - Tooltip`;
                            const index = allImages.findIndex(img => img.title === title);
                            setZoomImage({ url: existingImage.image_url, title, category: 'tooltips', index });
                          }}
                        >
                          <img
                            src={existingImage.image_url}
                            alt={`${section.name} - Tooltip`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Modal de Zoom da Imagem */}
      <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex-1">{zoomImage?.title}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="ml-2"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogHeader>
          
          <div className="relative flex items-center justify-center">
            {/* Botão Anterior */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background"
              onClick={() => navigateImage('prev')}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            
            {/* Imagem */}
            <div className="flex items-center justify-center overflow-auto px-16">
              {zoomImage && (
                <img 
                  src={zoomImage.url} 
                  alt={zoomImage.title} 
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              )}
            </div>
            
            {/* Botão Próximo */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background"
              onClick={() => navigateImage('next')}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
          
          {/* Indicador de posição */}
          <div className="text-center text-sm text-muted-foreground">
            {zoomImage && `${allImages.findIndex(img => img.url === zoomImage.url) + 1} de ${allImages.length}`}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageCacheTab;
