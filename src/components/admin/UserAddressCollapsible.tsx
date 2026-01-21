import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin, ExternalLink } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface UserAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface UserAddressCollapsibleProps {
  address: UserAddress;
  className?: string;
}

export function UserAddressCollapsible({ address, className }: UserAddressCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if address has any data
  const hasAddress = address.street || address.city || address.zipCode;

  if (!hasAddress) {
    return (
      <span className={`text-xs text-muted-foreground italic ${className}`}>
        Endereço não cadastrado
      </span>
    );
  }

  // Build full address for Google Maps
  const fullAddress = [
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
    address.zipCode
  ].filter(Boolean).join(", ");

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            {isOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Endereço
          </Button>
        </CollapsibleTrigger>

        {/* Location icon that opens Google Maps */}
        <a 
          href={googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 transition-colors"
          title="Ver no Google Maps"
        >
          <MapPin className="w-4 h-4" />
        </a>
      </div>

      <CollapsibleContent>
        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1 border border-border/50">
          {address.street && (
            <p className="text-foreground">
              <span className="text-muted-foreground">Rua:</span> {address.street}
              {address.number && `, ${address.number}`}
              {address.complement && ` - ${address.complement}`}
            </p>
          )}
          {address.neighborhood && (
            <p className="text-foreground">
              <span className="text-muted-foreground">Bairro:</span> {address.neighborhood}
            </p>
          )}
          {(address.city || address.state) && (
            <p className="text-foreground">
              <span className="text-muted-foreground">Cidade:</span> {address.city}
              {address.state && ` - ${address.state}`}
            </p>
          )}
          {address.zipCode && (
            <p className="text-foreground">
              <span className="text-muted-foreground">CEP:</span> {address.zipCode}
            </p>
          )}
          
          {/* Link to Google Maps */}
          <a 
            href={googleMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors mt-2"
          >
            <ExternalLink className="w-3 h-3" />
            Ver no Google Maps
          </a>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
