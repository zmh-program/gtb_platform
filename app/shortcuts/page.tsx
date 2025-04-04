import { Card } from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/theme-switcher";
import ShortcutsEditor from "./shortcuts-editor";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { RAW_SHORTCUTS, SHORTCUTS_COUNT } from "@/lib/shortcuts";

export default function ShortcutsPage() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col row-start-2 items-center w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-2.5">
          Shortcuts Editor
          <ThemeSwitcher />
        </h1>
        <Card className="p-6 bg-background/95 rounded-lg w-full">
          <ShortcutsEditor />

          <hr className="my-6" />

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Built-in Shortcuts</h2>
            <p className="text-sm text-muted-foreground">
              Default shortcuts/multiwords available in the game (
              {SHORTCUTS_COUNT} shortcuts)
            </p>
          </div>
          <Textarea
            value={RAW_SHORTCUTS}
            readOnly
            className="min-h-[400px] text-sm mt-4"
          />
        </Card>
        <div className="flex space-x-2 mt-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to Home
          </Link>
          <span className="text-sm text-muted-foreground">|</span>
          <Link
            href="/stats"
            className="text-sm text-muted-foreground hover:underline"
          >
            Build Battle Stats
          </Link>
        </div>
      </main>
    </div>
  );
}
