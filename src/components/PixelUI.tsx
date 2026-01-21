import React from "react";
import { cn } from "@/lib/utils";

interface PixelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "accent";
}

export function PixelCard({ 
  children, 
  className, 
  variant = "default",
  ...props 
}: PixelCardProps) {
  const variantStyles = {
    default: "bg-card text-card-foreground",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  };

  return (
    <div 
      className={cn(
        "border-4 border-black p-6 shadow-pixel transition-all",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export function PixelButton({ 
  children, 
  className, 
  variant = "default", 
  size = "md",
  ...props 
}: PixelButtonProps) {
  const baseStyles = "font-display uppercase tracking-widest transition-all active:shadow-pixel-active active:translate-x-1 active:translate-y-1 focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const variants = {
    default: "bg-primary text-primary-foreground border-4 border-black shadow-pixel hover:shadow-pixel-hover hover:-translate-y-0.5 hover:-translate-x-0.5",
    outline: "bg-transparent text-foreground border-4 border-black shadow-pixel hover:bg-secondary hover:shadow-pixel-hover hover:-translate-y-0.5 hover:-translate-x-0.5",
    ghost: "bg-transparent text-foreground hover:bg-muted border-4 border-transparent",
  };
  
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-12 px-6 text-lg",
    lg: "h-16 px-10 text-xl",
    icon: "h-12 w-12 flex items-center justify-center p-0",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)} 
      {...props}
    >
      {children}
    </button>
  );
}
