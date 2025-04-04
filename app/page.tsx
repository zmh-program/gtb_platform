import { Card } from "@/components/ui/card";
import HintTest from "./hint-test";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col row-start-2 items-center">
        <h1 className="text-2xl font-bold mb-2.5">
          GTB HINTEST_
          <ThemeSwitcher />
        </h1>
        <Card className="p-2 bg-background/95 rounded-lg md:min-w-[400px]">
          <HintTest />
        </Card>
        <Link
          href="/stats"
          className="mt-4 text-sm text-muted-foreground hover:underline"
        >
          Build Battle Stats
        </Link>
      </main>
    </div>
  );
}
