export default function PageBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gradient-to-b from-background to-background/95 dark:from-background dark:to-background/95">
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
      {children}
      <style jsx global>{`
        .bg-grid-pattern {
          background-image: radial-gradient(
            circle,
            var(--foreground-rgb, #666) 1px,
            transparent 1px
          );
          background-size: 24px 24px;
          mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0)
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0)
          );
        }
        @media (prefers-color-scheme: dark) {
          .bg-grid-pattern {
            background-image: radial-gradient(
              circle,
              var(--foreground-rgb, #999) 1px,
              transparent 1px
            );
          }
        }
      `}</style>
    </div>
  );
}
