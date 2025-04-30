"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Lamp,
  CirclePlay,
  Star,
  Award,
  Crown,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getLocalStorage } from "@/lib/utils";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import PageBackground from "@/components/page-background";

const RANKS = [
  {
    name: "Rookie",
    threshold: 0,
    icon: <Star className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Apprentice",
    threshold: 100,
    icon: <Shield className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Skilled",
    threshold: 250,
    icon: <Zap className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Talented",
    threshold: 500,
    icon: <Lamp className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Professional",
    threshold: 1000,
    icon: <Award className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Artisan",
    threshold: 2000,
    icon: <Crown className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Expert",
    threshold: 3000,
    icon: <Trophy className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Master",
    threshold: 5000,
    icon: <Trophy className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Legend",
    threshold: 10000,
    icon: <Trophy className="w-3.5 h-3.5 text-muted-foreground" />,
  },
  {
    name: "Grandmaster",
    threshold: 20000,
    icon: <Trophy className="w-3.5 h-3.5 text-muted-foreground" />,
  },
];

function getRank(score: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) {
      return {
        current: RANKS[i],
        next: RANKS[i + 1],
        progress:
          i < RANKS.length - 1
            ? ((score - RANKS[i].threshold) /
                (RANKS[i + 1].threshold - RANKS[i].threshold)) *
              100
            : 100,
      };
    }
  }
  return {
    current: RANKS[0],
    next: RANKS[1],
    progress: (score / RANKS[1].threshold) * 100,
  };
}

function RankContent() {
  const score = parseInt(getLocalStorage("score") || "0");
  const { current, next, progress } = getRank(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-4 w-full"
    >
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: 0.95 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="w-20 h-20 mx-auto bg-gradient-to-br from-muted/20 to-muted/5 rounded-full flex items-center justify-center shadow-inner"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-foreground to-foreground/80 rounded-full flex items-center justify-center shadow-lg">
            <Trophy className="w-8 h-8 text-background" />
          </div>
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{current.name}</h2>
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="px-2 py-0.5 bg-muted/20 rounded-full">
              <p className="text-xs font-medium text-foreground">
                Score: {score.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {next && (
        <div className="space-y-2 bg-muted/10 p-4 rounded-lg border border-border/30 shadow-sm">
          <div className="flex justify-between items-center text-sm font-medium">
            <div className="flex items-center gap-1.5">
              {current.icon}
              <span className="text-foreground">{current.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{next.name}</span>
              {next.icon}
            </div>
          </div>
          <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${progress}%`, opacity: 1 }}
              transition={{
                width: { duration: 1.5, ease: "easeOut" },
                opacity: { duration: 0.6, ease: "easeIn" },
              }}
              className="h-full bg-gradient-to-r from-foreground/80 to-foreground rounded-full"
            />
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
            <span>{score.toLocaleString()}</span>
            <span className="font-medium text-foreground">
              {Math.round(next.threshold - score).toLocaleString()} points until
              next rank
            </span>
            <span>{next.threshold.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 border-b pb-2">
          <Lamp className="w-4 h-4 text-muted-foreground" />
          Rank Progression
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {RANKS.map((rank, index) => (
            <motion.div
              key={rank.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-3 rounded-md border text-xs flex items-center gap-2 cursor-pointer",
                rank.name === current.name
                  ? "bg-muted/40 border-foreground/20 shadow-sm"
                  : "border-border hover:bg-muted/40 transition-colors",
              )}
            >
              <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center shadow-sm">
                {rank.icon}
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-medium ${
                    rank.name === current.name ? "text-foreground" : ""
                  }`}
                >
                  {rank.name}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {rank.threshold.toLocaleString()}+ pts
                </span>
              </div>
              {rank.name === current.name && (
                <div className="ml-auto w-2 h-2 rounded-full bg-foreground animate-pulse" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button
          size="lg"
          className="w-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 shadow-sm"
          asChild
        >
          <Link href="/">
            <CirclePlay className="w-4 h-4 mr-2" />
            Back to Game
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

export default function RankPage() {
  return (
    <PageBackground>
      <main className="flex flex-col row-start-2 items-center w-full max-w-2xl z-10">
        <div className="flex items-center justify-between w-full mb-4">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-foreground" />
            Ranking
          </h1>
          <ThemeSwitcher />
        </div>
        <div className="bg-background/95 dark:bg-background/95 rounded-lg w-full shadow-sm border border-border dark:border-border backdrop-blur-sm overflow-hidden">
          <RankContent />
        </div>
      </main>
    </PageBackground>
  );
}
