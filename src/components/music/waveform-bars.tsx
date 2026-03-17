"use client";

import { cn } from "@/lib/utils";

export function WaveformBars({
  samples,
  progress = 0,
  className,
  height = 48,
}: {
  samples: number[];
  progress?: number;
  className?: string;
  height?: number;
}) {
  const width = Math.max(samples.length * 5, 120);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-full w-full overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {samples.map((sample, index) => {
        const barHeight = Math.max(6, sample * height);
        const x = index * 5 + 1;
        const y = (height - barHeight) / 2;
        const completed = index / Math.max(1, samples.length - 1) <= progress;

        return (
          <rect
            key={`${index}-${sample}`}
            x={x}
            y={y}
            width="3"
            height={barHeight}
            rx="1.5"
            className={completed ? "fill-[var(--waveform-active)]" : "fill-[var(--waveform-muted)]"}
          />
        );
      })}
    </svg>
  );
}
