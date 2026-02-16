"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { mailApi } from "@/lib/api/mail";
import { EMAIL_DOMAIN } from "@/lib/constants";
import type { PersonItem } from "@/lib/constants";

interface RecipientInputProps {
  recipients: PersonItem[];
  onChange: (recipients: PersonItem[]) => void;
  placeholder?: string;
  borderless?: boolean;
}

export function RecipientInput({
  recipients,
  onChange,
  placeholder = "Add recipient...",
  borderless = false,
}: RecipientInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await mailApi.getSuggestedReceivers(query);
      setSuggestions(res.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inputValue.trim().length >= 1) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(inputValue.trim());
      }, 300);
    } else {
      setSuggestions([]);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchSuggestions]);

  function normalizeAddress(input: string): string {
    const trimmed = input.trim().toLowerCase();
    if (trimmed.includes("@")) return trimmed;
    return `${trimmed}@${EMAIL_DOMAIN}`;
  }

  function addRecipient(value: string) {
    const address = normalizeAddress(value);
    if (!address || address === `@${EMAIL_DOMAIN}`) return;
    // Avoid duplicates
    if (recipients.some((r) => r.address === address)) {
      setInputValue("");
      return;
    }
    const name = address.split("@")[0];
    onChange([...recipients, { name, address }]);
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
  }

  function removeRecipient(index: number) {
    onChange(recipients.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
        addRecipient(suggestions[selectedSuggestion]);
      } else if (inputValue.trim()) {
        addRecipient(inputValue);
      }
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      recipients.length > 0
    ) {
      removeRecipient(recipients.length - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative">
      <div className={`flex flex-wrap gap-1 items-center ${borderless ? "" : "min-h-8 rounded-md border border-input bg-background px-3 py-1 focus-within:ring-1 focus-within:ring-ring"}`}>
        {recipients.map((r, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
          >
            {r.address}
            <Button
              variant="ghost"
              size="icon"
              className="h-3.5 w-3.5 p-0 hover:bg-transparent"
              onClick={() => removeRecipient(i)}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setSelectedSuggestion(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={recipients.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                i === selectedSuggestion ? "bg-accent" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                addRecipient(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
