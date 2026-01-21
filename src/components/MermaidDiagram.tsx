import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

interface MermaidDiagramProps {
  chart: string;
  id: string;
  theme?: 'dark' | 'light';
}

export const MermaidDiagram = ({ chart, id, theme = 'dark' }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: theme === 'light' ? 'default' : 'dark',
        themeVariables: theme === 'light' ? {
          primaryColor: '#0ea5e9',
          primaryTextColor: '#1e293b',
          primaryBorderColor: '#0284c7',
          lineColor: '#64748b',
          secondaryColor: '#10b981',
          tertiaryColor: '#3b82f6',
          background: '#f8fafc',
          mainBkg: '#ffffff',
          textColor: '#1e293b',
        } : {
          primaryColor: '#8B5CF6',
          primaryTextColor: '#fff',
          primaryBorderColor: '#7C3AED',
          lineColor: '#A78BFA',
          secondaryColor: '#10B981',
          tertiaryColor: '#3B82F6',
          background: '#1a1a2e',
          mainBkg: '#16213e',
          textColor: '#fff',
        },
      });

      const renderDiagram = async () => {
        try {
          const { svg } = await mermaid.render(id, chart);
          if (containerRef.current) {
            // Sanitize SVG output to prevent XSS attacks
            const sanitizedSvg = DOMPurify.sanitize(svg, {
              USE_PROFILES: { svg: true, svgFilters: true },
              ADD_TAGS: ['foreignObject'],
            });
            containerRef.current.innerHTML = sanitizedSvg;
          }
        } catch (error) {
          console.error('Error rendering mermaid diagram:', error);
        }
      };

      renderDiagram();
    }
  }, [chart, id]);

  return <div ref={containerRef} className="mermaid-diagram my-6" />;
};
