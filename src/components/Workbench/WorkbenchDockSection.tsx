import React from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkbenchDockSectionProps {
    title: string;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    onClose?: () => void;
    children: React.ReactNode;
    className?: string;
}

export function WorkbenchDockSection({
    title,
    collapsed = false,
    onToggleCollapsed,
    onClose,
    children,
    className,
}: WorkbenchDockSectionProps) {
    return (
        <section className={cn("bg-white border border-black/10 rounded-sm overflow-hidden", className)}>
            <div className="h-11 px-3 border-b border-black/10 bg-muted/60 flex items-center gap-2">
                <span className="text-sm font-bold truncate">{title}</span>
                <div className="ml-auto flex items-center gap-1">
                    {onToggleCollapsed && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleCollapsed}
                            className="h-7 w-7 p-0"
                            title={collapsed ? "展开面板" : "折叠面板"}
                        >
                            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </Button>
                    )}
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-7 w-7 p-0"
                            title="隐藏面板"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
            {!collapsed && children}
        </section>
    );
}
