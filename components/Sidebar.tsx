"use client";

import {
  Library,
  Plus,
  BookText,
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
import { cn } from "@/lib/utils";

export default function AppSidebar({
  essays,
  canCreateEssay,
  onNew,
  onOpenBook,
}: {
  essays: Essay[];
  canCreateEssay: boolean;
  onNew: () => void;
  onOpenBook: () => void;
}) {
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground group-data-[collapsible=icon]:hidden">
            <BookText className="size-4" />
          </div>
          <span className="font-[family-name:var(--font-book)] text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Essays
          </span>
          <Badge
            variant="secondary"
            className="tabular-nums group-data-[collapsible=icon]:hidden"
          >
            {essays.length}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-8 group-data-[collapsible=icon]:ml-0"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={canCreateEssay ? "New essay" : "Create a book first"}
                aria-disabled={!canCreateEssay}
                onClick={canCreateEssay ? onNew : undefined}
                className={cn(
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground",
                  !canCreateEssay && "cursor-not-allowed opacity-50",
                )}
              >
                <Plus />
                <span>New essay</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Library" onClick={onOpenBook}>
                <Library />
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
