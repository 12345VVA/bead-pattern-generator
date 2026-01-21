import { Link, useLocation } from "wouter";
import { Grid3X3, Github, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelButton } from "./PixelUI";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="flex-shrink-0 z-50 w-full border-b-4 border-black bg-background p-4">
      <div className="container mx-auto flex items-center justify-between gap-4">
        {/* Logo - 最左边 */}
        <Link
          href="/"
          className="flex items-center gap-2 group flex-shrink-0"
        >
          <div className="bg-primary text-primary-foreground p-1 border-2 border-black group-hover:bg-accent transition-colors">
            <Grid3X3 size={32} strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl md:text-3xl font-bold tracking-tight border-b-4 border-transparent group-hover:border-accent transition-colors">
            BeadGen
          </span>
        </Link>

        {/* 导航 - 中间 */}
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className={cn(
              "font-display text-xl hover:text-primary transition-colors",
              location === "/" && "text-primary underline decoration-4 underline-offset-4"
            )}
          >
            Create
          </Link>
        </nav>

        {/* GitHub - 最右边 */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:block flex-shrink-0"
        >
          <PixelButton variant="outline" size="sm" className="h-10">
            <Github className="mr-2 h-4 w-4" /> GitHub
          </PixelButton>
        </a>
      </div>
    </header>
  );
}

export function Footer({ statusMessage }: { statusMessage?: React.ReactNode }) {
  return (
    <footer className="border-t-4 border-black bg-muted px-6 py-3 mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <p className="font-display text-sm text-muted-foreground">
            © 2026 BeadGen. Made for Crafters.
          </p>
        </div>

        {/* 状态消息区域 */}
        {statusMessage ? (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded border border-amber-300">
            {statusMessage}
          </div>
        ) : (
          <p className="font-body text-xs text-muted-foreground">
            Pixelate your world, one bead at a time.
          </p>
        )}
      </div>
    </footer>
  );
}
