import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database, 
  RefreshCw,
  Code,
  Table,
  Stethoscope
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface FunctionInfo {
  function_name: string;
  function_definition: string;
}

export function PWADiagnosticsModal() {
  const [open, setOpen] = useState(false);

  // Query pwa_devices schema using raw SQL via postgREST
  const { data: schemaData, isLoading: schemaLoading, refetch: refetchSchema } = useQuery({
    queryKey: ["pwa-diagnostics-schema"],
    queryFn: async () => {
      // Use the RPC function we created (cast to any to bypass type checking until types regenerate)
      const { data, error } = await (supabase.rpc as any)("get_pwa_devices_schema");
      if (error) throw error;
      return data as ColumnInfo[];
    },
    enabled: open,
  });

  // Query register_pwa_user function definition
  const { data: functionData, isLoading: functionLoading, refetch: refetchFunction } = useQuery({
    queryKey: ["pwa-diagnostics-function"],
    queryFn: async () => {
      // Use the RPC function we created (cast to any to bypass type checking until types regenerate)
      const { data, error } = await (supabase.rpc as any)("get_register_pwa_user_definition");
      if (error) throw error;
      // The function returns a table, so we get the first row
      const rows = data as FunctionInfo[];
      return rows && rows.length > 0 ? rows[0] : null;
    },
    enabled: open,
  });

  // Query recent pwa_devices entries
  const { data: recentDevices, isLoading: devicesLoading } = useQuery({
    queryKey: ["pwa-diagnostics-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pwa_devices")
        .select("id, user_name, user_email, user_registration_id, is_trusted, is_verified, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const requiredColumns = [
    "user_registration_id",
    "is_trusted",
    "user_name",
    "user_email",
    "is_verified",
    "is_blocked",
  ];

  const checkColumnExists = (columnName: string): boolean => {
    return schemaData?.some((col) => col.column_name === columnName) ?? false;
  };

  const handleRefresh = () => {
    refetchSchema();
    refetchFunction();
    toast({ title: "Refreshing diagnostics..." });
  };

  const isLoading = schemaLoading || functionLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Stethoscope className="h-4 w-4 mr-2" />
          PWA Diagnostics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              PWA Schema Diagnostics
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Required Columns Check */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  pwa_devices Required Columns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {requiredColumns.map((col) => {
                      const exists = checkColumnExists(col);
                      return (
                        <div
                          key={col}
                          className="flex items-center justify-between p-2 rounded bg-muted/50"
                        >
                          <code className="text-sm">{col}</code>
                          {exists ? (
                            <Badge className="bg-green-500/20 text-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Present
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-500">
                              <XCircle className="h-3 w-3 mr-1" />
                              Missing
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Full Schema */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Full pwa_devices Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schemaLoading ? (
                  <Skeleton className="h-32" />
                ) : schemaData && schemaData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Column</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Nullable</th>
                          <th className="text-left p-2">Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schemaData.map((col) => (
                          <tr key={col.column_name} className="border-b border-muted">
                            <td className="p-2 font-mono">{col.column_name}</td>
                            <td className="p-2 text-muted-foreground">{col.data_type}</td>
                            <td className="p-2">{col.is_nullable}</td>
                            <td className="p-2 text-muted-foreground truncate max-w-32">
                              {col.column_default || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Could not fetch schema info</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Function Definition */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  register_pwa_user Function
                </CardTitle>
              </CardHeader>
              <CardContent>
                {functionLoading ? (
                  <Skeleton className="h-32" />
                ) : functionData ? (
                  <div className="space-y-2">
                    <Badge variant="outline">{functionData.function_name}</Badge>
                    <ScrollArea className="h-48 rounded border p-2">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {functionData.function_definition}
                      </pre>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Could not fetch function definition</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Devices Sample */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  Recent pwa_devices Entries (Sample)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {devicesLoading ? (
                  <Skeleton className="h-24" />
                ) : recentDevices && recentDevices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">user_name</th>
                          <th className="text-left p-2">user_email</th>
                          <th className="text-left p-2">user_registration_id</th>
                          <th className="text-left p-2">is_trusted</th>
                          <th className="text-left p-2">is_verified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentDevices.map((device) => (
                          <tr key={device.id} className="border-b border-muted">
                            <td className="p-2">{device.user_name || "-"}</td>
                            <td className="p-2">{device.user_email || "-"}</td>
                            <td className="p-2 font-mono text-muted-foreground">
                              {device.user_registration_id?.substring(0, 8) || "-"}
                            </td>
                            <td className="p-2">
                              {device.is_trusted ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                            </td>
                            <td className="p-2">
                              {device.is_verified ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No devices found</span>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
