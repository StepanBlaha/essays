"use client";

import {
  Library,
  Plus,
  BookText,
  Files,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { Essay } from "@/lib/db";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AppSidebar({
  essays,
  showingLibrary,
  showingAllEssays,
  onNew,
  onOpenBook,
  onOpenAllEssays,
}: {
  essays: Essay[];
  showingLibrary: boolean;
  showingAllEssays: boolean;
  onNew: () => void;
  onOpenBook: () => void;
  onOpenAllEssays: () => void;
}) {
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  // On mobile the sidebar is an off-canvas sheet — dismiss it after a nav tap.
  const nav = (fn: () => void) => () => {
    fn();
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground group-data-[collapsible=icon]:hidden">
            <BookText className="size-4" aria-hidden="true" />
          </div>
          <span className="font-[family-name:var(--font-book)] text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Essays
          </span>
          <Badge
            variant="secondary"
            className="tabular-nums group-data-[collapsible=icon]:hidden"
            aria-label={`${essays.length} ${essays.length === 1 ? "essay" : "essays"}`}
          >
            {essays.length}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-8 group-data-[collapsible=icon]:ml-0"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-keyshortcuts="Meta+B"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="New essay"
                onClick={nav(onNew)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              >
                <Plus aria-hidden="true" />
                <span>New essay</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="All essays"
                onClick={nav(onOpenAllEssays)}
                isActive={showingAllEssays}
                aria-current={showingAllEssays ? "page" : undefined}
              >
                <Files aria-hidden="true" />
                <span>All essays</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Library"
                onClick={nav(onOpenBook)}
                isActive={showingLibrary}
                aria-current={showingLibrary ? "page" : undefined}
              >
                <Library aria-hidden="true" />
                <span>Library</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
