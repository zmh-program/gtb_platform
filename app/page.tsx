import { Card } from "@/components/ui/card";
import HintTest from "./hint-test";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { ArrowRightIcon, BarChartIcon, PaletteIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col row-start-2 items-center md:w-2xl">
        <h1 className="text-xl sm:text-2xl font-bold mb-2.5 flex items-center text-center gap-2">
          GTB Wordhint Training
          <ThemeSwitcher />
        </h1>
        <Card className="p-2 bg-background/95 rounded-lg w-full">
          <HintTest />
        </Card>

        <div className="w-full mt-8 space-y-4">
          <Card className="bg-background/95 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
            <Link href="/stats" className="block">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <BarChartIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      Build Battle Statistic Tracker
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track and analyze your build battle stats
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </Card>

          <Card className="bg-background/95 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
            <Link href="/themes" className="block">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <PaletteIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">GTB Theme Search Engine</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Search GTB themes, translations, and more
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}
