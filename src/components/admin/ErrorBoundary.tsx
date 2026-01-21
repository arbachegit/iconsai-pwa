import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 m-6 bg-destructive/5 border-destructive/20">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {this.props.fallbackMessage || "Ocorreu um erro ao renderizar este componente"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {this.state.error?.message || "Erro desconhecido"}
              </p>
            </div>

            <Button 
              onClick={this.handleRetry}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </Button>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-4 text-left w-full max-w-2xl">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Detalhes técnicos (desenvolvimento)
                </summary>
                <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-48">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
