"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

interface AutocompleteInputProps {
  /** Unique id */
  id: string;
  /** Placeholder text */
  placeholder?: string;
  /** All available options */
  options: string[];
  /** Current value */
  value: string;
  /** Called when value changes (free text + selection) */
  onChange: (value: string) => void;
  /** Whether options are still loading */
  loading?: boolean;
  /** Max visible results */
  maxVisible?: number;
}

export function AutocompleteInput({
  id,
  placeholder = "Search...",
  options,
  value,
  onChange,
  loading = false,
  maxVisible = 50,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Filter options
  const filtered = search.trim()
    ? options
        .filter((o) => o.toLowerCase().includes(search.toLowerCase()))
        .slice(0, maxVisible)
    : options.slice(0, maxVisible);

  const select = useCallback(
    (item: string) => {
      onChange(item);
      setSearch("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true);
        e.preventDefault();
        return;
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          select(filtered[highlightIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setSearch("");
        break;
    }
  };

  const isActive = value && value !== "";

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search
          size={14}
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            isActive ? "text-[#1A56DB]" : "text-[#ADB5BD]"
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          id={id}
          className={`w-full border rounded-lg pl-9 pr-9 py-2.5 text-[15px] focus:outline-none focus:shadow-[0_0_0_3px_#E8F0FE] ${
            isActive
              ? "border-[#1A56DB] bg-[#E8F0FE] text-[#1A56DB]"
              : "border-[#E9ECEF] text-[#212529] focus:border-[#1A56DB]"
          }`}
          placeholder={placeholder}
          value={open ? search : value}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            setHighlightIndex(-1);
            onChange(v);
            setOpen(true);
          }}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {isActive && !open && (
          <X
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C757D] hover:text-[#DC3545] cursor-pointer"
            onClick={() => {
              onChange("");
              setSearch("");
            }}
          />
        )}
        {open && (
          <X
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ADB5BD] cursor-pointer hover:text-[#6C757D]"
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E9ECEF] rounded-lg shadow-lg z-50 overflow-hidden">
          {filtered.length === 0 && !loading ? (
            <div className="px-3 py-4 text-[13px] text-[#ADB5BD] text-center">
              No matches
            </div>
          ) : loading ? (
            <div className="px-3 py-4 text-[13px] text-[#ADB5BD] text-center">
              Loading...
            </div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto py-1">
              {filtered.map((item, idx) => (
                <button
                  key={`${id}-${item}`}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-[14px] hover:bg-[#F8F9FA] transition-colors ${
                    idx === highlightIndex
                      ? "bg-[#E8F0FE] text-[#1A56DB]"
                      : ""
                  }`}
                  onClick={() => select(item)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
