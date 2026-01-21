import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, Loader2, User, MessageSquare, CheckCircle2, XCircle, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ContactModalProps {
  children: React.ReactNode;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const MAX_SUBJECT_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 1000;
const RATE_LIMIT_SECONDS = 60;

export const ContactModal = ({ children }: ContactModalProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const isEmailValid = useMemo(() => validateEmail(email), [email]);
  const isSubjectValid = subject.trim().length >= 3;
  const isMessageValid = message.trim().length >= 10;

  const showEmailError = emailTouched && email.length > 0 && !isEmailValid;
  const showEmailSuccess = emailTouched && email.length > 0 && isEmailValid;
  const showSubjectError = subjectTouched && !isSubjectValid;
  const showSubjectSuccess = subjectTouched && isSubjectValid;
  const showMessageError = messageTouched && !isMessageValid;
  const showMessageSuccess = messageTouched && isMessageValid;

  // Rate limiting cooldown timer
  useEffect(() => {
    if (!lastSubmitTime) return;
    
    const updateCooldown = () => {
      const elapsed = Math.floor((Date.now() - lastSubmitTime) / 1000);
      const remaining = Math.max(0, RATE_LIMIT_SECONDS - elapsed);
      setCooldownRemaining(remaining);
      
      if (remaining === 0) {
        setLastSubmitTime(null);
      }
    };
    
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastSubmitTime]);

  const isRateLimited = cooldownRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (isRateLimited) {
      toast({
        title: t('contact.rateLimitTitle'),
        description: t('contact.rateLimitDescription', { seconds: cooldownRemaining }),
        variant: "destructive",
      });
      return;
    }
    
    // Honeypot anti-spam check - silently reject if filled
    if (honeypot) {
      toast({
        title: t('contact.successTitle'),
        description: t('contact.successDescription'),
      });
      setIsOpen(false);
      return;
    }
    
    if (!isEmailValid) {
      toast({
        title: t('contact.invalidEmailTitle'),
        description: t('contact.invalidEmailDescription'),
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Call the centralized contact-form-handler Edge Function
      // This handles: DB insert, emails, and notification dispatch with logging
      const { data, error } = await supabase.functions.invoke('contact-form-handler', {
        body: {
          email,
          subject,
          message,
          metadata: {
            user_agent: navigator.userAgent,
            language: navigator.language,
          }
        },
      });

      if (error) throw error;

      // Set rate limit after successful send
      setLastSubmitTime(Date.now());

      // Show success animation
      setShowSuccess(true);
      
      // Reset form
      setEmail("");
      setSubject("");
      setMessage("");
      setHoneypot("");
      setEmailTouched(false);
      setSubjectTouched(false);
      setMessageTouched(false);
      
      // Close modal after animation
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
        toast({
          title: t('contact.successTitle'),
          description: t('contact.successDescription'),
        });
      }, 2000);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: t('contact.errorTitle'),
        description: t('contact.errorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const isFormValid = isEmailValid && isSubjectValid && isMessageValid;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!showSuccess) setIsOpen(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-md border-primary/20 overflow-hidden">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            {/* Animated checkmark circle */}
            <div className="relative w-24 h-24 mb-6">
              <svg 
                className="w-24 h-24" 
                viewBox="0 0 100 100"
              >
                {/* Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="animate-[circle-draw_0.6s_ease-out_forwards]"
                  style={{
                    strokeDasharray: 283,
                    strokeDashoffset: 283,
                    animation: 'circle-draw 0.6s ease-out forwards'
                  }}
                />
                {/* Checkmark */}
                <path
                  d="M30 50 L45 65 L70 35"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 60,
                    strokeDashoffset: 60,
                    animation: 'check-draw 0.4s ease-out 0.5s forwards'
                  }}
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              {t('contact.successTitle')}
            </h3>
            <p className="text-muted-foreground text-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
              {t('contact.successDescription')}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-gradient">
                <Mail className="h-5 w-5 text-primary" />
                {t('contact.title')}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Honeypot field - invisible to users, catches bots */}
          <div className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {t('contact.emailLabel')}
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder={t('contact.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                className={`bg-background/50 pr-10 transition-colors ${
                  showEmailError 
                    ? 'border-destructive focus:border-destructive' 
                    : showEmailSuccess 
                      ? 'border-green-500 focus:border-green-500' 
                      : 'border-primary/20 focus:border-primary/50'
                }`}
                disabled={isSending}
              />
              {showEmailSuccess && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {showEmailError && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            {showEmailError && (
              <p className="text-xs text-destructive mt-1">
                {t('contact.emailError')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              {t('contact.subjectLabel')}
            </Label>
            <div className="relative">
              <Input
                id="subject"
                type="text"
                placeholder={t('contact.subjectPlaceholder')}
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, MAX_SUBJECT_LENGTH))}
                onBlur={() => setSubjectTouched(true)}
                maxLength={MAX_SUBJECT_LENGTH}
                className={`bg-background/50 pr-10 transition-colors ${
                  showSubjectError 
                    ? 'border-destructive focus:border-destructive' 
                    : showSubjectSuccess 
                      ? 'border-green-500 focus:border-green-500' 
                      : 'border-primary/20 focus:border-primary/50'
                }`}
                disabled={isSending}
              />
              {showSubjectSuccess && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {showSubjectError && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex justify-between items-center">
              {showSubjectError ? (
                <p className="text-xs text-destructive">
                  {t('contact.subjectError')}
                </p>
              ) : <span />}
              <span className={`text-xs ${
                MAX_SUBJECT_LENGTH - subject.length <= 10 
                  ? 'text-destructive' 
                  : 'text-muted-foreground'
              }`}>
                {MAX_SUBJECT_LENGTH - subject.length}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {t('contact.messageLabel')}
            </Label>
            <div className="relative">
              <Textarea
                id="message"
                placeholder={t('contact.messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                onBlur={() => setMessageTouched(true)}
                maxLength={MAX_MESSAGE_LENGTH}
                className={`bg-background/50 min-h-[120px] resize-none pr-10 transition-colors ${
                  showMessageError 
                    ? 'border-destructive focus:border-destructive' 
                    : showMessageSuccess 
                      ? 'border-green-500 focus:border-green-500' 
                      : 'border-primary/20 focus:border-primary/50'
                }`}
                disabled={isSending}
              />
              {showMessageSuccess && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
              )}
              {showMessageError && (
                <XCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex justify-between items-center">
              {showMessageError ? (
                <p className="text-xs text-destructive">
                  {t('contact.messageError')}
                </p>
              ) : <span />}
              <span className={`text-xs ${
                MAX_MESSAGE_LENGTH - message.length <= 50 
                  ? 'text-destructive' 
                  : 'text-muted-foreground'
              }`}>
                {MAX_MESSAGE_LENGTH - message.length}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {t('contact.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSending || !isFormValid || isRateLimited}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRateLimited ? (
                <Clock className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isRateLimited 
                ? t('contact.cooldownMessage', { seconds: cooldownRemaining })
                : t('contact.send')
              }
            </Button>
          </div>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
