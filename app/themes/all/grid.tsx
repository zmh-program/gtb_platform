"use client";

import dynamic from "next/dynamic";
import type { ThemesAllGridProps } from "./grid-impl";

const ThemesAllGridImpl = dynamic<ThemesAllGridProps>(
  () => import("./grid-impl"),
  { ssr: false },
);

export default function ThemesAllGrid(props: ThemesAllGridProps) {
  return <ThemesAllGridImpl {...props} />;
}
