import React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkbenchSidebarProps {
    title: string;
    collapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    collapsedWidthClassName?: string;
    expandedWidthClassName?: string;
}

export function WorkbenchSidebar({
    title,
    collapsed,
    onToggle,
    children,
    collapsedWidthClassName = "w-16",
    expandedWidthClassName = "w-72",
}: WorkbenchSidebarProps) {
    return (
        <aside
            className={cn(
                "border-r-4 border-black bg-card flex flex-col overflow-hidden transition-all duration-200 ease-out",
                collapsed ? collapsedWidthClassName : expandedWidthClassName
            )}
        >
            <div className="h-14 border-b-4 border-black bg-white flex items-center justify-between px-3 flex-shrink-0">
                {!collapsed && <span className="font-display text-lg font-bold truncate">{title}</span>}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="h-8 w-8 p-0 ml-auto rounded-sm border border-black/10 bg-white/80 hover:bg-muted"
                    title={collapsed ? "展开侧栏" : "折叠侧栏"}
                >
                    {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </Button>
            </div>
            {collapsed ? (
                <div className="flex-1 flex items-center justify-center text-[10px] tracking-[0.25em] text-muted-foreground [writing-mode:vertical-rl]">
                    {title}
                </div>
            ) : (
                children
            )}
        </aside>
    );
}
