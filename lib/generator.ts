import { ALL_TRANSLATIONS } from "./source/source";
import { TranslationItem } from "./source/types";

function getThemesByLangCode(lang_code: string): {
  item: TranslationItem;
  translation: string;
}[] {
  return ALL_TRANSLATIONS.map((item) => {
    const translation =
      lang_code === "en"
        ? item.theme
        : item.translations?.[lang_code as keyof typeof item.translations]
            ?.translation || item.theme;
    return {
      item,
      translation,
    };
  });
}

function filterDataPoints(point: number, lang_code?: string) {
  // <=5 letter is 1 point theme
  // 6-8 letter is 2 point theme
  // >=9 letter is 3 point theme

  const themes = getThemesByLangCode(lang_code || "en");
  if (point === 1) {
    return themes.filter((item) => item.translation.length <= 5);
  } else if (point === 2) {
    return themes.filter(
      (item) => item.translation.length >= 6 && item.translation.length <= 8,
    );
  } else if (point === 3) {
    return themes.filter((item) => item.translation.length >= 9);
  }

  return [];
}

function createSampleTheme(data: string[]) {
  return data[Math.floor(Math.random() * data.length)];
}

function getHint(sample: string, hintLength: number) {
  // Create array of indices that can be shown as hints
  const availableIndices = Array.from(
    { length: sample.length },
    (_, i) => i,
  ).filter((i) => sample[i] !== " "); // Exclude spaces from being hints

  const hint_len =
    hintLength >= availableIndices.length
      ? availableIndices.length - 1
      : hintLength;

  // Randomly select hint_len number of indices to show
  const selectedIndices = [];
  for (let i = 0; i < hint_len && availableIndices.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    selectedIndices.push(availableIndices[randomIndex]);
    availableIndices.splice(randomIndex, 1);
  }

  // Build the hint string with underscores for hidden letters
  let hint = "";
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === " ") {
      hint += " ";
    } else if (selectedIndices.includes(i)) {
      hint += sample[i];
    } else {
      hint += "_";
    }
  }

  return hint.toLowerCase().trim();
}

function getMatchedAnswer(hint: string, data: string[]) {
  // Filter answers that match the hint pattern
  return data.filter((raw_answer) => {
    const answer = raw_answer.toLowerCase().trim();
    // Return false if lengths don't match
    if (answer.length !== hint.length) return false;

    // Check each character position
    for (let i = 0; i < hint.length; i++) {
      // If hint has a letter, it must match exactly
      if (hint[i] !== "_" && hint[i] !== answer[i]) {
        return false;
      }
      // If hint has a space, answer must have space in same position
      if (hint[i] === " " && answer[i] !== " ") {
        return false;
      }
      // If hint has underscore, answer must have letter in that position
      if (hint[i] === "_" && answer[i] === " ") {
        return false;
      }
    }
    return true;
  });
}

export function generateHintTest(
  point: number,
  hint_length: number,
  lang_code?: string,
) {
  const data = filterDataPoints(point, lang_code);
  const translations = data.map((item) => item.translation);
  const themes = data.map((item) => item.item);

  const sample = createSampleTheme(translations);

  const hint = getHint(sample, hint_length);
  const matchedAnswers = getMatchedAnswer(hint, translations);
  const matchedThemes = themes.filter((theme) =>
    matchedAnswers.includes(theme.theme),
  );

  return {
    hint,
    matchedAnswers,
    matchedThemes,
  };
}

export function generateMoreHint(answer: string, hint: string) {
  // Return original hint if lengths don't match
  if (answer.length !== hint.length) return hint;

  // Convert strings to arrays for easier manipulation
  const hintArr = hint.split("");
  const answerArr = answer.split("");

  // Find all underscore positions in hint
  const underscorePositions = hintArr
    .map((char, i) => (char === "_" ? i : -1))
    .filter((i) => i !== -1);

  // If no underscores left, return original hint
  if (underscorePositions.length <= 1) return hint;

  // Randomly select one underscore position to reveal
  const randomIndex = Math.floor(Math.random() * underscorePositions.length);
  const positionToReveal = underscorePositions[randomIndex];

  // Replace underscore with actual letter from answer
  hintArr[positionToReveal] = answerArr[positionToReveal];

  return hintArr.join("");
}
