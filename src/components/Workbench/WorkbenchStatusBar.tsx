import React from "react";
import { cn } from "@/lib/utils";

interface StatusItem {
    label: string;
    value: React.ReactNode;
    tone?: "default" | "muted" | "accent";
}

interface WorkbenchStatusBarProps {
    items: StatusItem[];
    hint?: React.ReactNode;
}

export function WorkbenchStatusBar({ items, hint }: WorkbenchStatusBarProps) {
    return (
        <div className="h-11 border-t-4 border-black bg-white flex items-center gap-3 px-4 flex-shrink-0 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className={cn(
                            "inline-flex items-center gap-2 rounded border-2 border-black px-2.5 py-1 text-xs min-w-max",
                            item.tone === "accent" && "bg-primary/15",
                            item.tone === "muted" && "bg-muted text-muted-foreground",
                            (!item.tone || item.tone === "default") && "bg-background"
                        )}
                    >
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono font-bold">{item.value}</span>
                    </div>
                ))}
            </div>
            {hint && (
                <div className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                    {hint}
                </div>
            )}
        </div>
    );
}
