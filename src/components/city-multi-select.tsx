"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { METROS } from "@/lib/types";
import { MapPin, ChevronDown, Search } from "lucide-react";

interface CityMultiSelectProps {
  selected: string[];
  onChange: (metros: string[]) => void;
}

export function CityMultiSelect({ selected, onChange }: CityMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return METROS;
    const q = search.toLowerCase();
    return METROS.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.state.toLowerCase().includes(q)
    );
  }, [search]);

  const selectedNames = METROS.filter((m) => selected.includes(m.id)).map(
    (m) => m.name
  );

  let triggerLabel: string;
  if (selected.length === 0 || selected.length === METROS.length) {
    triggerLabel = "All cities";
  } else if (selected.length === 1) {
    triggerLabel = selectedNames[0];
  } else {
    triggerLabel = `${selectedNames[0]} +${selected.length - 1}`;
  }

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-2.5 pr-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
      >
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate max-w-[140px]">{triggerLabel}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-56 p-0">
        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search cities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              No cities match &ldquo;{search}&rdquo;
            </p>
          ) : (
            filtered.map((metro) => (
              <button
                key={metro.id}
                type="button"
                onClick={() => toggle(metro.id)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-100 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.includes(metro.id)}
                  tabIndex={-1}
                  className="pointer-events-none"
                />
                <span className="text-sm">{metro.label}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex gap-3 border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => onChange(METROS.map((m) => m.id))}
            className="text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
