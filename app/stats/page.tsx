import { Suspense } from "react";
import { StatsContent } from "./component";

export const metadata = {
  title: "Hypixel Build Battle Statistic Dashboard",
  description:
    "Track and analyze your Hypixel Build Battle statistics across all game modes. View comprehensive statistics for Solo, Teams, Pro, GTB, and SPB modes. Share your stats with a unique URL and download screenshots easily.",
  openGraph: {
    title: "Hypixel Build Battle Statistic Dashboard",
    description:
      "Track and analyze your Hypixel Build Battle statistics across all game modes. View comprehensive statistics for Solo, Teams, Pro, GTB, and SPB modes. Share your stats with a unique URL and download screenshots easily.",
    url: "https://gtb.zmh.me/stats",
    type: "website",
  },
  keywords: [
    "Hypixel",
    "Build Battle",
    "Stats",
    "Dashboard",
    "GTB",
    "SPB",
    "Pro",
    "Teams",
    "Solo",
  ],
};

export default function Stats() {
  return (
    <Suspense fallback={<div />}>
      <StatsContent />
    </Suspense>
  );
}
