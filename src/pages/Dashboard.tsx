import { DashboardTab } from "@/components/admin/DashboardTab";
import { IndicatorAPITable } from "@/components/dashboard/IndicatorAPITable";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <Link 
            to="/admin" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar ao Admin
          </Link>
          <div className="ml-auto">
            <span className="text-sm font-medium text-foreground">Dashboard Autônomo</span>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container py-6 px-4 space-y-6">
        <DashboardTab />
        <IndicatorAPITable />
      </main>
    </div>
  );
};

export default Dashboard;
