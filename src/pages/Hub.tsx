import { useNavigate } from "react-router-dom";
import { Smartphone, LayoutDashboard, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserBadge } from "@/components/UserBadge";
import knowyouLogo from "@/assets/knowyou-admin-logo.png";

interface HubCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  gradient: string;
}

function HubCard({ title, description, icon: Icon, onClick, gradient }: HubCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`
        group relative overflow-hidden cursor-pointer
        p-8 border-border/50 bg-card/50 backdrop-blur-sm
        hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10
        transition-all duration-300 hover:scale-[1.02]
      `}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${gradient}`} />
      
      {/* Content */}
      <div className="relative flex flex-col items-center text-center gap-4">
        <div className={`
          w-20 h-20 rounded-2xl flex items-center justify-center
          bg-gradient-to-br ${gradient} shadow-lg
          group-hover:scale-110 transition-transform duration-300
        `}>
          <Icon className="w-10 h-10 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  );
}

export default function Hub() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "App",
      description: "Acesse o aplicativo principal com assistente IA e análises",
      icon: Smartphone,
      path: "/app",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      title: "Dashboard",
      description: "Visualize indicadores, analytics e dados regionais",
      icon: LayoutDashboard,
      path: "/dashboard",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      title: "Painel Admin",
      description: "Gerencie configurações, usuários e sistema",
      icon: Shield,
      path: "/admin",
      gradient: "from-orange-500 to-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
        <img src={knowyouLogo} alt="KnowYOU" className="h-8" />
        <div /> {/* Spacer central */}
        <UserBadge />
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
        <div className="max-w-4xl w-full">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Central de Navegação
            </h1>
            <p className="text-muted-foreground">
              Selecione uma área para acessar
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => (
              <HubCard
                key={card.path}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onClick={() => navigate(card.path)}
                gradient={card.gradient}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
