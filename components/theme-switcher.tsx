"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 border border-background w-fit dark:border-border rounded-full bg-muted/40 p-1 backdrop-blur-sm transition-all absolute top-2 right-2 md:top-4 md:right-4 lg:relative lg:top-0 lg:right-0 lg:ml-2">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                theme === "light" && "bg-background text-primary shadow-sm",
              )}
              onClick={() => setTheme("light")}
              aria-label="Light theme"
            >
              <Sun className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Light</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                theme === "dark" && "bg-background text-primary shadow-sm",
              )}
              onClick={() => setTheme("dark")}
              aria-label="Dark theme"
            >
              <Moon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Dark</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                theme === "system" && "bg-background text-primary shadow-sm",
              )}
              onClick={() => setTheme("system")}
              aria-label="System theme"
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">System</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
