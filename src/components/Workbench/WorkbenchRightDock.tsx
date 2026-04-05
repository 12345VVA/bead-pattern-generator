import React from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkbenchRightDockProps {
    collapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    collapsedWidthClassName?: string;
    expandedWidthClassName?: string;
}

export function WorkbenchRightDock({
    collapsed,
    onToggle,
    children,
    collapsedWidthClassName = "w-14",
    expandedWidthClassName = "w-80",
}: WorkbenchRightDockProps) {
    return (
        <aside
            className={cn(
                "border-l-4 border-black bg-card relative flex flex-col overflow-hidden transition-all duration-200 ease-out",
                collapsed ? collapsedWidthClassName : expandedWidthClassName
            )}
        >
            <div className="absolute right-2 top-2 z-10">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="h-8 w-8 p-0 ml-auto rounded-sm border border-black/10 bg-white/80 hover:bg-muted"
                    title={collapsed ? "展开信息栏" : "折叠信息栏"}
                >
                    {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
                </Button>
            </div>
            {collapsed ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="flex flex-col gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            )}
        </aside>
    );
}
