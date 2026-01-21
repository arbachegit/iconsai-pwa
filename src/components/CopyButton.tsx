import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useState } from "react";

interface CopyButtonProps {
  content: string;
}

export function CopyButton({ content }: CopyButtonProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: t("chat.copied"),
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: t("chat.copyFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="h-7 w-7 shrink-0"
    >
      {copied ? (
        <Check className="h-3 w-3 text-accent" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}
