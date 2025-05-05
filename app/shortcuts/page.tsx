"use client";

import { Card } from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getRawLocalShortcuts, saveLocalShortcut } from "@/lib/shortcuts";
import { toast } from "sonner";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TOTAL_THEMES, TOTAL_TRANSLATIONS } from "@/lib/source/source";

function ShortcutsEditor() {
  const [shortcuts, setShortcuts] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedShortcuts = getRawLocalShortcuts();
    setShortcuts(savedShortcuts);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      saveLocalShortcut(shortcuts);
      toast.success("Shortcuts saved successfully!");
    } catch (error) {
      toast.error("Failed to save shortcuts");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setShortcuts("");
    saveLocalShortcut("");
    toast.success("Shortcuts reset successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Custom Shortcuts
          <Badge variant="outline" className="ml-0.5">
            {
              shortcuts
                .split("\n")
                .filter(
                  (line) =>
                    line.trim() !== "" &&
                    line.split("=").filter((part) => part.trim() !== "")
                      .length === 2,
                ).length
            }
          </Badge>
        </h2>
        <p className="text-sm text-muted-foreground">
          Add your custom shortcuts and multiwords below.
        </p>
      </div>

      <Alert
        variant="default"
        className="bg-muted/50 border-muted-foreground/20"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm font-medium">
          Custom Shortcuts
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          Custom shortcuts/multiwords are user-defined content. Their
          effectiveness in actual Hypixel Guess The Build gameplay is not
          guaranteed. The Hint Practicing system has already integrated{" "}
          <span className="font-bold">{TOTAL_THEMES}</span> themes and{" "}
          <span className="font-bold">{TOTAL_TRANSLATIONS}</span> translations (
          <span className="font-bold">
            including unapproved crowdin translations and more extensive
            conversion algorithms
          </span>{" "}
          that may not be available in the actual game).
        </AlertDescription>
      </Alert>

      <Textarea
        value={shortcuts}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setShortcuts(e.target.value);
          saveLocalShortcut(e.target.value);
        }}
        placeholder={`Enter your custom shortcuts and multiwords...

e.g.
Tavle = Blackboard, Whiteboard
Kwal = Jellyfish
          `}
        className="min-h-[340px] text-sm font-mono border-muted-foreground/20 focus-visible:ring-primary/50"
      />

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
          className="border-muted-foreground/20 hover:bg-muted/50"
        >
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

export default function ShortcutsPage() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col row-start-2 items-center w-full max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2 text-center">
          Custom Shortcuts
          <ThemeSwitcher />
        </h1>
        <Card className="p-6 sm:p-8 bg-background/95 rounded-lg w-full shadow-sm border-muted-foreground/10">
          <ShortcutsEditor />
        </Card>
        <div className="flex space-x-2 pt-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
