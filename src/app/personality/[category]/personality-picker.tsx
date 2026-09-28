"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PersonalityCategoryConfig } from "@/lib/personality-content";

export function PersonalityPicker({ config }: { config: PersonalityCategoryConfig }) {
  const keys = Object.keys(config.data);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 text-center font-display text-3xl text-foreground">{config.title}</h1>
      <p className="mb-1 text-center text-sm text-muted-foreground">{config.subtitle}</p>
      <p className="mb-8 text-center text-xs text-muted-foreground/70">{config.source}</p>

      <div className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={cn(
              "rounded-lg border px-3 py-3 text-sm transition-colors",
              selected === key
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            {config.labelPrefix}
            {key}
          </button>
        ))}
      </div>

      {selected && (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <p className="font-display text-xl text-foreground">
              {config.labelPrefix}
              {selected}
            </p>
            <p className="text-sm text-muted-foreground">{config.data[selected]}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
