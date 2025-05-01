"use client";
import { toast } from "sonner";
import { generateHintTest, generateMoreHint } from "@/lib/generator";
import { useReducer, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CirclePlay,
  Eye,
  RotateCcw,
  Lamp,
  Trophy,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { getLocalStorage, setLocalStorage } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { getShortcut } from "@/lib/shortcuts";
import { isWorkTheme } from "@/lib/translations";
import { TranslationItem } from "@/lib/source/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type LanguageOption = {
  label: string;
  native?: string;
  badge?: string;
};

const languageOptions: Record<string, LanguageOption> = {
  default: { label: "English", badge: "Recommended" },
  zh_cn: { label: "Chinese Simplified", native: "简体中文" },
  zh_tw: { label: "Chinese Traditional", native: "繁體中文" },
  ru: { label: "Russian", native: "Русский" },
  ja: { label: "Japanese", native: "日本語" },
  ko: { label: "Korean", native: "한국어" },
  en: { label: "Pirate English", native: "Pirate English" },
  de: { label: "German", native: "Deutsch" },
  es: { label: "Spanish", native: "Español" },
  fi: { label: "Finnish", native: "Suomi" },
  fr: { label: "French", native: "Français" },
  hu: { label: "Hungarian", native: "Magyar" },
  it: { label: "Italian", native: "Italiano" },
  nl: { label: "Dutch", native: "Nederlands" },
  no: { label: "Norwegian", native: "Norsk" },
  pl: { label: "Polish", native: "Polski" },
  pt: { label: "Portuguese", native: "Português" },
  ro: { label: "Romanian", native: "Română" },
  sv: { label: "Swedish", native: "Svenska" },
  tr: { label: "Turkish", native: "Türkçe" },
  uk: { label: "Ukrainian", native: "Українська" },
  cs: { label: "Czech", native: "Čeština" },
  da: { label: "Danish", native: "Dansk" },
};

function getStructure(hint: string | undefined) {
  if (!hint) return "";
  const segements = hint.split(" ");
  const lengths = segements.map((seg) => seg.length);
  return lengths.join("-");
}

type GameState = {
  status: "start" | "playing" | "won" | "timeout";
  point: number;
  hintLength: number;
  hint?: string;
  matchedAnswers?: string[];
  matchedThemes?: TranslationItem[];
  moreHints?: Record<string, string>;
  answer: string;
  foundAnswers: string[];
  showAllAnswers: boolean;
  timeLeft: number;
  score: number;
  enableShortcut: boolean;
  language: string;
};

function includesAnswer(checkingAnswer: string, anwsersList: string[]) {
  return anwsersList
    .map((answer) => answer.replace(/ /g, "").trim())
    .includes(checkingAnswer.replace(/ /g, "").trim());
}

type GameAction =
  | {
      type: "START_GAME";
      payload: {
        point: number;
        hintLength: number;
        enableShortcut: boolean;
        language: string;
      };
    }
  | { type: "SET_POINT"; payload: number }
  | { type: "SET_HINT_LENGTH"; payload: number }
  | { type: "SET_ENABLE_SHORTCUT"; payload: boolean }
  | { type: "SET_LANGUAGE"; payload: string }
  | { type: "SUBMIT_ANSWER"; payload: string }
  | { type: "CHECK_ANSWER" }
  | { type: "SHOW_ALL_ANSWERS" }
  | { type: "RESET_GAME" }
  | { type: "GET_MORE_HINT"; payload: string }
  | { type: "GET_ALL_HINTS" }
  | { type: "TICK_TIMER" }
  | { type: "TIMEOUT" };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const { hint, matchedAnswers, matchedThemes } = generateHintTest(
        action.payload.point,
        action.payload.hintLength,
        action.payload.language,
      );

      return {
        ...state,
        point: action.payload.point,
        hintLength: action.payload.hintLength,
        enableShortcut: action.payload.enableShortcut,
        language: action.payload.language,
        status: "playing",
        hint,
        matchedAnswers,
        matchedThemes,
        moreHints: {},
        answer: "",
        foundAnswers: [],
        showAllAnswers: false,
        timeLeft: 90,
      };
    }
    case "SET_POINT":
      setLocalStorage("point", action.payload.toString());
      return { ...state, point: action.payload };
    case "SET_HINT_LENGTH":
      setLocalStorage("hint_length", action.payload.toString());
      return { ...state, hintLength: action.payload };
    case "SET_ENABLE_SHORTCUT":
      setLocalStorage("enable_shortcut", action.payload.toString());
      return { ...state, enableShortcut: action.payload };
    case "SET_LANGUAGE":
      setLocalStorage("language", action.payload);
      return { ...state, language: action.payload };
    case "SUBMIT_ANSWER":
      return { ...state, answer: action.payload };
    case "CHECK_ANSWER": {
      const userAnswer = state.answer.trim().toLowerCase();

      if (userAnswer.length === 0) {
        return { ...state, answer: "" };
      }

      const shortcuts = state.enableShortcut ? getShortcut(userAnswer) : [];

      if (state.enableShortcut) {
        console.debug(`[shortcuts] get shortcuts for ${userAnswer}`, shortcuts);
      }

      const newAnswers: string[] = [];
      const remainingAnswers = (state.matchedAnswers || []).filter(
        (answer) => !state.foundAnswers.includes(answer),
      );

      for (const answer of remainingAnswers) {
        const themes = state.matchedThemes?.filter(
          (theme) =>
            (state.language === "default"
              ? theme.theme
              : theme.translations?.[
                  state.language as keyof typeof theme.translations
                ]?.translation || theme.theme
            )
              .toLowerCase()
              .trim() === answer.toLowerCase().trim(),
        );

        if (
          answer === userAnswer ||
          shortcuts?.includes(answer) ||
          themes?.some((theme) => isWorkTheme(userAnswer, theme))
        ) {
          newAnswers.push(answer);
        }
      }

      if (newAnswers.length === 0) {
        toast.error("Answer is incorrect");
        return { ...state, answer: "" };
      }

      const newFoundAnswers = [...state.foundAnswers, ...newAnswers];
      const isComplete =
        newFoundAnswers.length === (state.matchedAnswers?.length || 0);

      if (isComplete) {
        const newScore = state.score + state.point;
        setLocalStorage("score", newScore.toString());
        toast.success(
          `Congratulations! You earned ${state.point} point${
            state.point > 1 ? "s" : ""
          }! Total score: ${newScore}`,
        );
        return {
          ...state,
          answer: "",
          foundAnswers: newFoundAnswers,
          status: "won",
          score: newScore,
        };
      }

      toast.success(
        `Answer is correct! Current progress: ${newFoundAnswers.length}/${state.matchedAnswers?.length || 0}`,
      );
      return {
        ...state,
        answer: "",
        foundAnswers: newFoundAnswers,
      };
    }
    case "TICK_TIMER": {
      if (state.timeLeft <= 1) {
        return {
          ...state,
          timeLeft: 0,
          status: "timeout",
          showAllAnswers: true,
        };
      }
      return {
        ...state,
        timeLeft: state.timeLeft - 1,
      };
    }
    case "TIMEOUT": {
      return {
        ...state,
        status: "timeout",
        showAllAnswers: true,
      };
    }
    case "GET_MORE_HINT": {
      const targetAnswer = action.payload;
      const currentHint = state.moreHints?.[targetAnswer] || state.hint;
      const moreHints = generateMoreHint(targetAnswer, currentHint || "");
      return {
        ...state,
        moreHints: {
          ...state.moreHints,
          [targetAnswer]: moreHints,
        },
      };
    }
    case "GET_ALL_HINTS": {
      const newMoreHints = { ...state.moreHints };
      state.matchedAnswers?.forEach((answer) => {
        if (!state.foundAnswers.includes(answer)) {
          const currentHint = state.moreHints?.[answer] || state.hint;
          newMoreHints[answer] = generateMoreHint(answer, currentHint || "");
        }
      });
      return {
        ...state,
        moreHints: newMoreHints,
      };
    }
    case "SHOW_ALL_ANSWERS":
      return { ...state, showAllAnswers: true };
    case "RESET_GAME":
      return { ...initialState, score: state.score };
    default:
      return state;
  }
}

const initialState: GameState = {
  status: "start",
  point: 1,
  hintLength: 2,
  answer: "",
  foundAnswers: [],
  showAllAnswers: false,
  timeLeft: 90,
  score: parseInt(getLocalStorage("score") || "0"),
  enableShortcut: true,
  language: getLocalStorage("language") || "default",
};

export default function HintTest() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [point, setPoint] = useState(getLocalStorage("point") || "1");
  const [hintLength, setHintLength] = useState(
    getLocalStorage("hint_length") || "2",
  );
  const [enableShortcut, setEnableShortcut] = useState(
    getLocalStorage("enable_shortcut") !== "false",
  );
  const [language, setLanguage] = useState(
    getLocalStorage("language") || "default",
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.status === "playing" && state.timeLeft > 0) {
      timer = setInterval(() => {
        dispatch({ type: "TICK_TIMER" });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state.status, state.timeLeft]);

  if (state.status === "start") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 p-6 w-full max-w-3xl mx-auto"
      >
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">
                  Theme Difficulty
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-help">
                        <span className="text-xs">?</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Select the difficulty level of themes to practice with
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <RadioGroup value={point} className="grid gap-3">
                {[
                  { value: "1", label: "Easy (≤5 letters)", id: "point-1" },
                  { value: "2", label: "Medium (6-8 letters)", id: "point-2" },
                  { value: "3", label: "Hard (≥9 letters)", id: "point-3" },
                ].map((option) => (
                  <div
                    key={option.id}
                    onClick={() => setPoint(option.value)}
                    className="flex items-center space-x-3 p-3 rounded-md border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <RadioGroupItem value={option.value} id={option.id} />
                    <Label
                      htmlFor={option.id}
                      className="font-medium cursor-pointer text-sm w-full"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="hint-length"
                  className="text-base font-semibold"
                >
                  Initial Hint Length
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-help">
                        <span className="text-xs">?</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Number of characters revealed at the start of the game
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="hint-length"
                type="number"
                min="1"
                max="5"
                value={hintLength}
                onChange={(e) =>
                  setHintLength(
                    e.target.value.replace(/[^0-9]/g, "") === "0"
                      ? "1"
                      : e.target.value.replace(/[^0-9]/g, ""),
                  )
                }
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                How many characters to reveal initially (1-5 recommended)
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Game Options</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-help">
                        <span className="text-xs">?</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Additional settings to customize your game experience
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-md border border-border">
                <Checkbox
                  id="enable-shortcut"
                  checked={enableShortcut}
                  onCheckedChange={(checked) => {
                    setEnableShortcut(checked as boolean);
                    dispatch({
                      type: "SET_ENABLE_SHORTCUT",
                      payload: checked as boolean,
                    });
                  }}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="enable-shortcut"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Custom Shortcuts
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow custom shortcuts and multi-word answers
                  </p>
                </div>
                <Link href="/shortcuts" className="group pr-1">
                  <Wrench className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between h-full">
            <div className="space-y-3 mb-3">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Language</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-help">
                        <span className="text-xs">?</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Select the language you want to practice with
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={language}
                onValueChange={(value) => {
                  setLanguage(value);
                  dispatch({ type: "SET_LANGUAGE", payload: value });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(languageOptions).map(
                    ([value, { label, native, badge }]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center space-x-1.5">
                          <span>{label}</span>
                          {native && (
                            <span className="text-xs text-muted-foreground">
                              ({native})
                            </span>
                          )}
                          {badge && (
                            <span className="ml-auto px-1.5 py-0.5 text-xs rounded-sm bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-500 font-medium">
                              {badge}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="p-6 rounded-lg bg-gradient-to-br from-background to-muted/50 border border-border shadow-sm space-y-5">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                </div>
                How to Play
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div className="text-sm leading-tight">
                    Find all words matching the given hint within{" "}
                    <span className="font-medium text-primary/90">
                      90 seconds
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div className="text-sm leading-tight">
                    Use{" "}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded text-xs font-medium">
                      <Lamp className="w-3 h-3" /> hint
                    </span>{" "}
                    buttons to reveal more letters when stuck
                  </div>
                </li>
                <li className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div className="text-sm leading-tight">
                    Higher difficulty themes earn{" "}
                    <span className="font-medium text-primary/90">
                      more points
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-auto space-y-3 pt-3">
              <Button
                size="md"
                className="w-full text-base"
                onClick={() => {
                  dispatch({
                    type: "START_GAME",
                    payload: {
                      point: parseInt(point) || 1,
                      hintLength: parseInt(hintLength) || 2,
                      enableShortcut: !!enableShortcut,
                      language: language,
                    },
                  });
                }}
              >
                <CirclePlay className="w-5 h-5 mr-2" />
                Start Game
              </Button>

              <Button variant="outline" size="md" className="w-full" asChild>
                <Link href="/rank">
                  <Trophy className="w-5 h-5 mr-2" />
                  Leaderboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (state.showAllAnswers || state.status === "timeout") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 p-6 w-full mx-auto"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50/50 border border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/80"
        >
          <img src="/emoji/alarm.png" alt="" className="w-6 h-6" />
          <p className="text-yellow-800 text-sm dark:text-yellow-500">
            {state.status === "timeout" ? "Time's up!" : "Game Over!"} You found{" "}
            {state.foundAnswers.length} out of {state.matchedAnswers?.length}{" "}
            answers.
          </p>
        </motion.div>
        <div className="space-y-2">
          <Label className="text-base font-semibold">Hint</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted text-sm">
            {state.hint}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold">Found Answers</Label>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {state.foundAnswers.map((answer) => (
                <motion.span
                  key={answer}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  <Link
                    href={`/themes?theme=${encodeURIComponent(answer)}&exact=true`}
                    target="_blank"
                    className="flex items-center"
                  >
                    <span>{answer}</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold">Missed Answers</Label>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {state.matchedAnswers
                ?.filter((answer) => !state.foundAnswers.includes(answer))
                .map((answer) => (
                  <motion.span
                    key={answer}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    <Link
                      href={`/themes?theme=${encodeURIComponent(answer)}&exact=true`}
                      target="_blank"
                      className="flex items-center"
                    >
                      <span>{answer}</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  </motion.span>
                ))}
            </AnimatePresence>
          </div>
        </div>
        <Button
          size="lg"
          className="w-full mt-4"
          onClick={() => dispatch({ type: "RESET_GAME" })}
        >
          <CirclePlay className="w-4 h-4 mr-2" />
          Play Again
        </Button>
      </motion.div>
    );
  }

  if (state.status === "won") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 p-6 w-full mx-auto"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-green-50/50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/40"
        >
          <img src="/emoji/fireworks.png" alt="" className="w-6 h-6" />
          <p className="text-green-800 text-sm dark:text-green-500">
            Congratulations! You found all {state.matchedAnswers?.length}{" "}
            answers with {state.timeLeft} seconds remaining!
          </p>
        </motion.div>
        <div className="space-y-2">
          <Label className="text-base font-semibold">Hint</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted text-sm">
            {state.hint}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold">Found Answers</Label>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {state.foundAnswers.map((answer) => (
                <motion.span
                  key={answer}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  <Link
                    href={`/themes?theme=${encodeURIComponent(answer)}&exact=true`}
                    target="_blank"
                    className="flex items-center"
                  >
                    <span>{answer}</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <Button
          size="lg"
          className="w-full mt-4"
          onClick={() => dispatch({ type: "RESET_GAME" })}
        >
          <CirclePlay className="w-4 h-4 mr-2" />
          Play Again
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6 w-full mx-auto"
    >
      <div className="flex justify-between items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-pointer select-none">
                {languageOptions[state.language]?.label || "English"}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Current language for themes</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="relative w-10 h-10">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="#e5e5e5"
              strokeWidth="3"
            />
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke={
                state.timeLeft > 30
                  ? "#22c55e"
                  : state.timeLeft > 10
                    ? "#eab308"
                    : "#ef4444"
              }
              strokeWidth="3"
              strokeDasharray={`${(state.timeLeft / 90) * 113} 113`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-xs font-medium ${state.timeLeft <= 10 ? "text-red-500" : ""}`}
            >
              {state.timeLeft}
            </span>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-2xl font-bold tracking-[2px] p-3 rounded-lg bg-muted text-center"
      >
        {state.hint}
        <span className="ml-2 text-xs text-muted-foreground tracking-normal font-normal">
          ({getStructure(state.hint)})
        </span>
      </motion.div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-base font-semibold flex items-center gap-1.5">
            <span>Found Answers</span>
            <Badge
              variant="secondary"
              className="px-2 py-0.5 h-auto text-xs font-medium rounded-full"
            >
              {state.foundAnswers.length}/{state.matchedAnswers?.length}
            </Badge>
          </Label>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full"
            onClick={() => dispatch({ type: "GET_ALL_HINTS" })}
          >
            <Lamp className="!h-4 !w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {state.foundAnswers.map((answer) => (
              <motion.span
                key={answer}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {answer}
              </motion.span>
            ))}

            {state.matchedAnswers
              ?.filter((answer) => !includesAnswer(answer, state.foundAnswers))
              .map((answer, index) => (
                <motion.div
                  key={`placeholder-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full"
                >
                  <span className="text-muted-foreground text-sm">
                    {state.moreHints?.[answer] || "??"}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 rounded-full"
                    onClick={() =>
                      dispatch({ type: "GET_MORE_HINT", payload: answer })
                    }
                  >
                    <Lamp className="!h-3.5 !w-3.5" />
                  </Button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: "CHECK_ANSWER" });
        }}
        className="space-y-3"
      >
        <Label htmlFor="answer" className="text-base font-semibold">
          Your Answer
        </Label>
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input
            id="answer"
            value={state.answer}
            onChange={(e) =>
              dispatch({ type: "SUBMIT_ANSWER", payload: e.target.value })
            }
            className="h-10"
          />
          <Button type="submit" className="h-10">
            Submit
          </Button>
        </div>
      </form>

      <div className="flex flex-col md:flex-row gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-10"
          onClick={() => dispatch({ type: "SHOW_ALL_ANSWERS" })}
        >
          <Eye className="w-4 h-4 mr-2" />
          Show All Answers
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-10"
          onClick={() => dispatch({ type: "RESET_GAME" })}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Game
        </Button>
      </div>
    </motion.div>
  );
}
