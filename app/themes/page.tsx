import { Suspense } from "react";
import ThemesPageContent from "./component";

export const metadata = {
  title: "GTB Theme Search Engine",
  description:
    "Search for GTB Themes, Translations, Shortcuts, Multiwords, and more",
  openGraph: {
    title: "GTB Theme Search Engine",
    description:
      "Search for GTB Themes, Translations, Shortcuts, Multiwords, and more",
    url: "https://gtb.zmh.me/themes",
    type: "website",
  },
  keywords: [
    "Hypixel",
    "GTB",
    "Guess The Build",
    "Themes",
    "Translations",
    "Shortcuts",
    "Multiwords",
  ],
};

export default function ThemesPage() {
  return (
    <Suspense fallback={<div />}>
      <ThemesPageContent />
    </Suspense>
  );
}
