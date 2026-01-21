import { Bell, Check, Trash2, FileText, MessageSquare, AlertCircle, CheckCircle, RefreshCw, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_document':
      return <FileText className="h-4 w-4 text-primary" />;
    case 'new_conversation':
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case 'doc_failed':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'doc_completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'doc_stuck':
      return <RefreshCw className="h-4 w-4 text-yellow-500" />;
    case 'api_ready_for_implementation':
      return <Rocket className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

export const NotificationsPanel = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useAdminNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer ${
                  !notification.is_read ? 'bg-muted/50' : ''
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
