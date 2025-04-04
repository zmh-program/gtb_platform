"use client";
import { toast } from "sonner";
import { generateHintTest, generateMoreHint } from "@/lib/generator";
import { useReducer, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CirclePlay, Eye, RotateCcw, Lamp, Trophy } from "lucide-react";
import { getLocalStorage, setLocalStorage } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";

const RANKS = [
  { name: "Rookie", threshold: 0 },
  { name: "Apprentice", threshold: 100 },
  { name: "Skilled", threshold: 250 },
  { name: "Talented", threshold: 500 },
  { name: "Professional", threshold: 1000 },
  { name: "Artisan", threshold: 2000 },
  { name: "Expert", threshold: 3000 },
  { name: "Master", threshold: 5000 },
  { name: "Legend", threshold: 10000 },
  { name: "Grandmaster", threshold: 20000 },
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

function getStructure(hint: string | undefined) {
  if (!hint) return "";
  const segements = hint.split(" ");
  const lengths = segements.map((seg) => seg.length);
  return lengths.join("-");
}

type GameState = {
  status: "start" | "playing" | "won" | "timeout" | "stats";
  point: number;
  hintLength: number;
  hint?: string;
  matchedAnswers?: string[];
  moreHints?: Record<string, string>;
  answer: string;
  foundAnswers: string[];
  showAllAnswers: boolean;
  timeLeft: number;
  score: number;
  enableShortcut: boolean;
};

function includesAnswer(checkingAnswer: string, anwsersList: string[]) {
  return anwsersList
    .map((answer) => answer.replace(/ /g, "").trim())
    .includes(checkingAnswer.replace(/ /g, "").trim());
}

type GameAction =
  | {
      type: "START_GAME";
      payload: { point: number; hintLength: number; enableShortcut: boolean };
    }
  | { type: "SET_POINT"; payload: number }
  | { type: "SET_HINT_LENGTH"; payload: number }
  | { type: "SET_ENABLE_SHORTCUT"; payload: boolean }
  | { type: "SUBMIT_ANSWER"; payload: string }
  | { type: "CHECK_ANSWER" }
  | { type: "SHOW_ALL_ANSWERS" }
  | { type: "RESET_GAME" }
  | { type: "GET_MORE_HINT"; payload: string }
  | { type: "GET_ALL_HINTS" }
  | { type: "TICK_TIMER" }
  | { type: "TIMEOUT" }
  | { type: "SHOW_STATS" };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const { hint, matchedAnswers } = generateHintTest(
        action.payload.point,
        action.payload.hintLength,
      );

      return {
        ...state,
        point: action.payload.point,
        hintLength: action.payload.hintLength,
        enableShortcut: action.payload.enableShortcut,
        status: "playing",
        hint,
        matchedAnswers,
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
    case "SUBMIT_ANSWER":
      return { ...state, answer: action.payload };
    case "CHECK_ANSWER": {
      const formattedAnswer = state.answer.trim().toLowerCase();

      if (formattedAnswer.length === 0) {
        return { ...state, answer: "" };
      }

      if (
        !includesAnswer(formattedAnswer, state.matchedAnswers || []) ||
        includesAnswer(formattedAnswer, state.foundAnswers)
      ) {
        toast.error("Answer is incorrect");
        return { ...state, answer: "" };
      }

      const newFoundAnswers = [...state.foundAnswers, formattedAnswer];
      const isComplete =
        newFoundAnswers.length === (state.matchedAnswers?.length || 0);

      if (isComplete) {
        const newScore = state.score + 1;
        setLocalStorage("score", newScore.toString());
        const rank = getRank(newScore);
        toast.success(
          `Congratulations! You earned a point! Total score: ${newScore} (${rank.current.name})`,
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
        "Answer is correct! Current progress: " +
          newFoundAnswers.length +
          "/" +
          (state.matchedAnswers?.length || 0),
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
    case "SHOW_STATS":
      return { ...state, status: "stats" };
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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.status === "playing" && state.timeLeft > 0) {
      timer = setInterval(() => {
        dispatch({ type: "TICK_TIMER" });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state.status, state.timeLeft]);

  if (state.status === "stats") {
    const { current, next, progress } = getRank(state.score);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 p-4 max-w-md mx-auto"
      >
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {current.name}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Score: {state.score.toLocaleString()}
          </p>
        </div>

        {next && (
          <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg border border-border/50">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-primary/80">{current.name}</span>
              <span className="text-muted-foreground">{next.name}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary/80 to-primary"
              />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-1">
              <span className="font-medium text-primary">
                {Math.round(next.threshold - state.score).toLocaleString()}
              </span>{" "}
              points until next rank
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Lamp className="w-3.5 h-3.5 text-amber-400" />
            Rank Progression
          </h3>
          <div className="grid grid-cols-2 gap-1.5 pr-1">
            {RANKS.map((rank) => (
              <motion.div
                key={rank.name}
                whileHover={{ scale: 1.02 }}
                className={`p-2 rounded-md border text-xs ${
                  rank.name === current.name
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-muted/30 border-border/50 hover:bg-muted/50 transition-colors"
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={`font-medium ${rank.name === current.name ? "text-primary" : ""}`}
                  >
                    {rank.name}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {rank.threshold.toLocaleString()}+ pts
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-md"
          onClick={() => dispatch({ type: "RESET_GAME" })}
        >
          <CirclePlay className="w-3.5 h-3.5 mr-1.5" />
          Back to Game
        </Button>
      </motion.div>
    );
  }

  if (state.status === "start") {
    const { current } = getRank(state.score);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 p-6 max-w-md mx-auto"
      >
        <div className="space-y-3">
          <Label className="text-base font-semibold">Select Theme Point</Label>
          <RadioGroup
            value={point}
            onValueChange={(value) => setPoint(value)}
            className="grid gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="point-1" />
              <Label
                htmlFor="point-1"
                className="font-medium cursor-pointer text-sm"
              >
                1 Point Theme (≤5 letters)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="point-2" />
              <Label
                htmlFor="point-2"
                className="font-medium cursor-pointer text-sm"
              >
                2 Point Theme (6-8 letters)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="point-3" />
              <Label
                htmlFor="point-3"
                className="font-medium cursor-pointer text-sm"
              >
                3 Point Theme (≥9 letters)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hint-length" className="text-base font-semibold">
            Initial Given Hint Length
          </Label>
          <Input
            id="hint-length"
            value={hintLength}
            onChange={(e) => setHintLength(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
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
            <Label
              htmlFor="enable-shortcut"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Enable SC/MW
            </Label>
          </div>
        </div>

        <div className="flex flex-col space-y-2.5">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              dispatch({
                type: "START_GAME",
                payload: {
                  point: parseInt(point) || 1,
                  hintLength: parseInt(hintLength) || 2,
                  enableShortcut: !!enableShortcut,
                },
              });
            }}
          >
            <CirclePlay className="w-4 h-4 mr-2" />
            Start Game
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => dispatch({ type: "SHOW_STATS" })}
          >
            <Trophy className="w-4 h-4 mr-2" />
            View Stats
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            Total Score: {state.score}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {current.name}
            </span>
          </p>
        </div>
      </motion.div>
    );
  }

  if (state.showAllAnswers || state.status === "timeout") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 p-6 max-w-md mx-auto"
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
                  {answer}
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
                    {answer}
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
        className="space-y-6 p-6 max-w-md mx-auto"
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
                  {answer}
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
      className="space-y-6 p-6 max-w-md mx-auto"
    >
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium"></div>
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
          <Label className="text-base font-semibold">
            Found Answers ({state.foundAnswers.length}/
            {state.matchedAnswers?.length})
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
