import { LayoutDashboard, CheckSquare, MessageCircle, LogOut, Shield, Users, Plus, Code, Key, Webhook, Archive, ScrollText, Hash } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import logoImage from '@/assets/logo.png';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Chat', url: '/chat', icon: MessageCircle },
];

const adminNavItems = [
  { title: 'Admin Dashboard', url: '/admin', icon: Shield },
  { title: 'Manage Users', url: '/admin/users', icon: Users },
  { title: 'Create Task', url: '/admin/create-task', icon: Plus },
  { title: 'Completed Tasks', url: '/admin/completed-tasks', icon: Archive },
  { title: 'Access Tokens', url: '/tokens', icon: Key },
  { title: 'Webhooks', url: '/webhooks', icon: Webhook },
  { title: 'Webhook Logs', url: '/webhook-logs', icon: ScrollText },
  { title: 'Channels', url: '/channels', icon: Hash },
];

// Items accessible by dev (non-admin)
const devNavItems = [
  { title: 'API Docs', url: '/api-docs', icon: Code },
  { title: 'Access Tokens', url: '/tokens', icon: Key },
  { title: 'Webhooks', url: '/webhooks', icon: Webhook },
  { title: 'Webhook Logs', url: '/webhook-logs', icon: ScrollText },
  { title: 'Channels', url: '/channels', icon: Hash },
];

export function AppSidebar() {
  const { profile, isAdmin, signOut, user } = useAuth();
  const { roles } = useUserRoles(user?.id);
  
  const isDev = roles.includes('dev');
  const canAccessApiDocs = isAdmin || isDev;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoImage} alt="BUDDY Logo" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
          <div>
            <h2 className="text-sm font-semibold text-sidebar-foreground">BUDDY</h2>
            <p className="text-xs text-muted-foreground">Internal Tools</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/'}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* API Docs for dev and admin */}
              {canAccessApiDocs && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/api-docs"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                    >
                      <Code className="h-4 w-4" />
                      <span>API Docs</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Dev section - only show if dev but not admin (admins see it in admin section) */}
        {isDev && !isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Developer
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {devNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
            <span className="text-xs font-medium text-sidebar-foreground">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'TM'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Team Member'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {isAdmin ? 'Admin' : isDev ? 'Developer' : 'Operations'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
