"use client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  ptbr: { label: "Portuguese, Brazilian", native: "Português do Brasil" },
  ro: { label: "Romanian", native: "Română" },
  sv: { label: "Swedish", native: "Svenska" },
  tr: { label: "Turkish", native: "Türkçe" },
  uk: { label: "Ukrainian", native: "Українська" },
  cs: { label: "Czech", native: "Čeština" },
  da: { label: "Danish", native: "Dansk" },
};

const languageOptionsWithComplement: Record<string, LanguageOption> = {
  ...languageOptions,
  co: { label: "Complement", native: "Complement" },
};

interface LanguageSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  showLabel?: boolean;
  showTooltip?: boolean;
  labelText?: string;
  tooltipText?: string;
  placeholder?: string;
  className?: string;
  showBadge?: boolean;
}

export function LanguageSelect({
  value,
  onValueChange,
  showLabel = false,
  showTooltip = true,
  labelText = "Language",
  tooltipText = "Select the language you want to practice with",
  placeholder = "Select language",
  className = "",
  showBadge = true,
}: LanguageSelectProps) {
  return (
    <div className={cn(showLabel && "space-y-3", className)}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">{labelText}</Label>
          {showTooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-help">
                    <span className="text-xs">?</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(languageOptions).map(
            ([value, { label, native, badge }]) => (
              <SelectItem key={value} value={value}>
                <div className="flex items-center space-x-1.5">
                  <span>{native || label}</span>
                  {native && (
                    <span className="text-xs text-muted-foreground">
                      ({label})
                    </span>
                  )}
                  {showBadge && badge && (
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
  );
}

export { languageOptions, languageOptionsWithComplement };
export type { LanguageOption };
