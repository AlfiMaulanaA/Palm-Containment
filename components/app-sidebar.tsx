 "use client";

import { memo } from "react";
import {
  BarChart3,
  HardDrive,
  Info,
  Hand,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Palm Recognition Containment";

const avatarIcon =
  process.env.NEXT_PUBLIC_APP_AVATAR_URL || "/images/avatar-user.png";

// Static menu configuration
const menuData = {
  groups: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/",
          icon: BarChart3,
          isUse: true,
        },
      ],
    },
    {
      title: "Access Control",
      items: [
        {
          title: "Palm Recognition",
          url: "/palm-recognition",
          icon: Hand,
          isUse: true,
        },
        {
          title: "Palm Users",
          url: "/palm-users",
          icon: Users,
          isUse: true,
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          title: "Information",
          url: "/info",
          icon: Info,
          isUse: true,
        },
      ],
    },
    {
      title: "Settings",
      items: [
        {
          title: "Open Door MQTT",
          url: "/settings/mqtt",
          icon: SettingsIcon,
          isUse: true,
        },
      ],
    },
  ],
};

export const AppSidebar = memo(function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4 bg-background">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center border-gray-400 justify-center rounded-lg bg-primary text-primary-foreground">
            <img
              src="/palm-icon.svg"
              alt="Palm Icon"
              className="h-5 w-5 text-primary-foreground"
              style={{ filter: 'invert(1)' }}
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              Palm
            </h1>
            <p className="text-xs text-sidebar-foreground/70">{appName}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent
        className="bg-background overflow-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {menuData.groups.map((group, groupIndex) => {
          // Filter items that have isUse: true
          const visibleItems = group.items.filter(item => item.isUse !== false);

          // Only render the group if it has visible items
          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <SidebarGroup key={groupIndex}>
              <SidebarGroupLabel className="text-sidebar-foreground/80">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item, itemIndex) => {
                    const IconComponent = item.icon;
                    return (
                      <SidebarMenuItem key={itemIndex} className="relative">
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                          className="group flex items-center gap-2 px-3 py-2 rounded-md w-full transition-colors text-sidebar-foreground hover:bg-muted/50 hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:border-l-primary"
                        >
                          <Link href={item.url}>
                            <IconComponent className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}


      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
});
