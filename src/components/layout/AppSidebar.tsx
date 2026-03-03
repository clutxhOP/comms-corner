import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  LogOut,
  Shield,
  Users,
  Plus,
  Building2,
  Contact,
  Radio,
  ActivitySquare,
  Code2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";
import logoImage from "@/assets/logo.png";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Chat", url: "/chat", icon: MessageCircle },
];

const adminNavItems = [
  { title: "Admin Dashboard", url: "/admin", icon: Shield },
  { title: "Manage Users", url: "/admin/users", icon: Users },
  { title: "Customers", url: "/customers", icon: Building2 },
  { title: "Sources Monitor", url: "/sources", icon: Radio },
  { title: "CRM", url: "/crm", icon: Contact },
  { title: "Create Task", url: "/admin/create-task", icon: Plus },
  { title: "Activity Log", url: "/activity", icon: ActivitySquare },
  { title: "Dev Tools", url: "/dev-tools", icon: Code2 },
];

const navLinkClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground";
const activeLinkClass = "bg-sidebar-accent text-sidebar-foreground font-medium";

export function AppSidebar() {
  const { profile, isAdmin, signOut } = useAuth();

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
                    <NavLink to={item.url} end={item.url === "/"} className={navLinkClass} activeClassName={activeLinkClass}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                      <NavLink to={item.url} className={navLinkClass} activeClassName={activeLinkClass}>
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
              {profile?.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2) || "TM"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || "Team Member"}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {isAdmin ? "Admin" : "Team Member"}
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
