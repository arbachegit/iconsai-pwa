// Landing page with lazy-loaded components
import React, { Suspense, lazy } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Section from "@/components/Section";
import { Link } from "react-router-dom";
import { Brain, Mail, Sparkles } from "lucide-react";
import knowriskLogo from "@/assets/knowrisk-logo.png";
import { useTranslation } from "react-i18next";
import { useYouTubeAutoPreload } from "@/hooks/useYouTubeAutoPreload";

// Lazy load below-the-fold components
const ChatStudy = lazy(() => import("@/components/ChatStudy"));
const MediaCarousel = lazy(() => import("@/components/MediaCarousel").then(m => ({ default: m.MediaCarousel })));
const DigitalExclusionSection = lazy(() => import("@/components/DigitalExclusionSection").then(m => ({ default: m.DigitalExclusionSection })));
const TuringLegacy = lazy(() => import("@/components/TuringLegacy"));
const FloatingChatButton = lazy(() => import("@/components/FloatingChatButton").then(m => ({ default: m.FloatingChatButton })));
const ScrollToTopButton = lazy(() => import("@/components/ScrollToTopButton").then(m => ({ default: m.ScrollToTopButton })));
const ContactModal = lazy(() => import("@/components/ContactModal").then(m => ({ default: m.ContactModal })));

// Simple loading placeholder
const SectionLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Index = () => {
  const { t, i18n } = useTranslation();
  
  // Auto-preload YouTube videos in background when cache expires
  useYouTubeAutoPreload();
  
  return <div className="min-h-screen bg-background">
      <Header />
      <div key={i18n.language} className="language-transition">
        <HeroSection />

      {/* Section 1: Software */}
      <Section 
        id="software" 
        title={t('sections.software.title')}
        subtitle={t('sections.software.subtitle')}
        quote={t('sections.software.quote')}
        quoteAuthor={t('sections.software.quoteAuthor')}
      >
        <p className="text-lg leading-relaxed">
          {t('sections.software.content1')}
        </p>
        <p className="text-lg leading-relaxed mt-4">
          {t('sections.software.content2')}
        </p>
      </Section>

      {/* Section 2: Internet */}
      <Section 
        id="internet" 
        title={t('sections.internet.title')}
        subtitle={t('sections.internet.subtitle')}
        reverse
        quote={t('sections.internet.quote')}
        quoteAuthor={t('sections.internet.quoteAuthor')}
      >
        <p className="text-lg leading-relaxed">
          {t('sections.internet.content1')}
        </p>
        <p className="text-lg leading-relaxed mt-4">
          {t('sections.internet.content2')}
        </p>
      </Section>

      {/* Section 3: Tecnologias Sem Propósito */}
      <Section 
        id="tech-sem-proposito" 
        title={t('sections.techNoPropose.title')}
        subtitle={t('sections.techNoPropose.subtitle')}
        quote={t('sections.techNoPropose.quote')}
        quoteAuthor={t('sections.techNoPropose.quoteAuthor')}
      >
        <p className="text-lg leading-relaxed">
          {t('sections.techNoPropose.content1')}
        </p>
        <p className="text-lg leading-relaxed mt-4">
          {t('sections.techNoPropose.content2')}
        </p>
      </Section>

      {/* Section 4: 1969 Kubrick */}
      <Section 
        id="kubrick" 
        title={t('sections.kubrick.title')}
        subtitle={t('sections.kubrick.subtitle')}
        reverse
        quote={t('sections.kubrick.quote')}
        quoteAuthor={t('sections.kubrick.quoteAuthor')}
      >
        <p className="text-lg leading-relaxed">
          {t('sections.kubrick.content1')}
        </p>
        <p className="text-lg leading-relaxed mt-4">
          {t('sections.kubrick.content2')}
        </p>
      </Section>

      {/* Section 5: Watson */}
      <Section 
        id="watson" 
        title={t('sections.watson.title')}
        subtitle={t('sections.watson.subtitle')}
        quote={t('sections.watson.quote')}
        quoteAuthor={t('sections.watson.quoteAuthor')}
      >
        <p className="text-lg leading-relaxed">
          {t('sections.watson.content1')}
        </p>
        <p className="text-lg leading-relaxed mt-4">
          {t('sections.watson.content2')}
        </p>
      </Section>

      {/* Section 6: IA Nova Era */}
      <Section 
        id="ia-nova-era" 
        title={t('sections.newEra.title')}
        subtitle={t('sections.newEra.subtitle')}
        reverse
        quote={t('sections.newEra.quote')}
        quoteAuthor={t('sections.newEra.quoteAuthor')}
      >
        <p className="text-lg leading-relaxed">
          {t('sections.newEra.content1')}
        </p>
        <p className="text-lg leading-relaxed mt-4">
          {t('sections.newEra.content2')}
        </p>
      </Section>

      {/* Section 7: KnowYOU - Interactive Chat - Custom Full Width Layout */}
      <section id="knowyou" className="py-8 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center space-y-6">
            {/* Title */}
            <h2 className="text-4xl md:text-5xl font-bold text-gradient">
              {t('sections.knowyou.title')}
            </h2>
            
            {/* Subtitle */}
            <p className="text-xl text-muted-foreground">
              {t('sections.knowyou.subtitle')}
            </p>
            
            {/* Description Text */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <p className="text-lg leading-relaxed">
                {t('sections.knowyou.content1')}
              </p>
              <p className="text-lg leading-relaxed">
                {t('sections.knowyou.content2')}
              </p>
            </div>
            
            {/* Chat Component - Full Width */}
            <div className="mt-8 w-full">
              <Suspense fallback={<SectionLoader />}>
                <ChatStudy />
              </Suspense>
            </div>
            
            {/* Media Carousel - Full Width */}
            <div className="mt-12 w-full">
              <Suspense fallback={<SectionLoader />}>
                <MediaCarousel />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* Digital Exclusion Section */}
      <Suspense fallback={<SectionLoader />}>
        <DigitalExclusionSection />
      </Suspense>

      {/* Section 8: Bom Prompt */}
      <Section
        id="bom-prompt" 
        title={t('sections.goodPrompt.title')}
        subtitle={t('sections.goodPrompt.subtitle')}
        reverse
        quote={t('sections.goodPrompt.quote')}
        quoteAuthor={t('sections.goodPrompt.quoteAuthor')}
      >
        <div className="relative">
          <Link to="/admin/login" className="absolute -top-16 right-0 text-muted-foreground/20 hover:text-muted-foreground/40 transition-opacity" aria-label="Admin Login">
            <Brain className="w-5 h-5" />
          </Link>
          
          <p className="text-lg leading-relaxed">
            {t('sections.goodPrompt.content1')}
          </p>
          <p className="text-lg leading-relaxed mt-4">
            {t('sections.goodPrompt.content2')}
          </p>
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-card rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary">{t('sections.goodPrompt.beSpecific')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('sections.goodPrompt.beSpecificDesc')}
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-secondary">{t('sections.goodPrompt.giveContext')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('sections.goodPrompt.giveContextDesc')}
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-accent">{t('sections.goodPrompt.iterateRefine')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('sections.goodPrompt.iterateRefineDesc')}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Turing Legacy Section */}
      <Suspense fallback={<SectionLoader />}>
        <TuringLegacy />
      </Suspense>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="relative">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <img src={knowriskLogo} alt="KnowRisk" className="h-8 w-auto" />
                <span className="text-lg font-bold text-gradient">KnowYOU</span>
                <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Power by Fernando Arbache</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('footer.tagline')}
              </p>
              <Suspense fallback={null}>
                <ContactModal>
                  <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mx-auto mt-2">
                    <Mail className="h-4 w-4" />
                    {t('contact.button')}
                  </button>
                </ContactModal>
              </Suspense>
              <p className="text-xs text-muted-foreground">
                {t('footer.copyright')}
              </p>
            </div>
            
            {/* Discreet Admin Link */}
            <Link to="/admin/login" className="absolute right-0 top-0 text-muted-foreground/20 hover:text-muted-foreground/40 transition-opacity" aria-label="Admin Login">
              <Brain className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </footer>
      </div>

      {/* Floating Chat Button */}
      <Suspense fallback={null}>
        <FloatingChatButton />
      </Suspense>
      
      {/* Scroll to Top Button */}
      <Suspense fallback={null}>
        <ScrollToTopButton />
      </Suspense>
    </div>;
};
export default Index;