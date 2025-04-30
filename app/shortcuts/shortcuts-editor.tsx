"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getRawLocalShortcuts,
  saveLocalShortcut,
} from "@/lib/custom_shortcuts";
import { toast } from "sonner";

export default function ShortcutsEditor() {
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
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Custom Shortcuts</h2>
        <p className="text-sm text-muted-foreground">
          Add your custom shortcuts and multiwords.
        </p>
      </div>

      <Textarea
        value={shortcuts}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setShortcuts(e.target.value);
          saveLocalShortcut(e.target.value);
        }}
        placeholder={`Enter your custom shortcuts...

e.g.
Tavle = Blackboard, Whiteboard
Kwal = Jellyfish
          `}
        className="min-h-[400px] text-sm"
      />

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
