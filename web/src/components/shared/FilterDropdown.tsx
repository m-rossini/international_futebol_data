"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, X, Search } from "lucide-react";

interface FilterDropdownProps {
  /** Unique id for the dropdown */
  id: string;
  /** Label shown on the trigger button when nothing is selected */
  label: string;
  /** All available options */
  options: string[];
  /** Currently selected values */
  selected: string[];
  /** Called when selection changes */
  onChange: (selected: string[]) => void;
  /** Max options to show — further ones hidden to keep panel fast */
  maxVisible?: number;
  /** Whether options are still loading */
  loading?: boolean;
}

export function FilterDropdown({
  id,
  label,
  options,
  selected,
  onChange,
  maxVisible = 300,
  loading = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      // Focus search on open
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const toggle = useCallback((item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  }, [selected, onChange]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const visibleOptions = options.slice(0, maxVisible);
  const filteredOptions = search.trim()
    ? visibleOptions.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : visibleOptions;

  const triggerText = loading
    ? `${label}...`
    : selected.length === 0
      ? label
      : selected.length === 1
        ? selected[0]
        : `${selected[0]}, +${selected.length - 1} more`;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          border rounded-lg px-3 py-2 text-[14px] min-w-[180px] max-w-[280px]
          flex items-center gap-2 justify-between
          focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_#E8F0FE]
          ${selected.length > 0
            ? "border-[#1A56DB] bg-[#E8F0FE] text-[#1A56DB]"
            : "border-[#E9ECEF] bg-white text-[#212529]"
          }
        `}
      >
        <span className="truncate text-left">{triggerText}</span>
        {selected.length > 0 ? (
          <X
            size={14}
            className="shrink-0 text-[#6C757D] hover:text-[#DC3545]"
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
          />
        ) : (
          <ChevronDown
            size={14}
            className={`shrink-0 text-[#6C757D] transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-[320px] bg-white border border-[#E9ECEF] rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E9ECEF]">
            <Search size={14} className="text-[#ADB5BD] shrink-0" />
            <input
              ref={searchRef}
              type="text"
              className="flex-1 text-[13px] outline-none text-[#212529] placeholder:text-[#ADB5BD]"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <X
                size={14}
                className="text-[#ADB5BD] cursor-pointer hover:text-[#6C757D]"
                onClick={() => setSearch("")}
              />
            )}
          </div>

          {/* Options */}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-[13px] text-[#ADB5BD] text-center">
                No matches
              </div>
            ) : (
              filteredOptions.map((item) => {
                const isSel = selected.includes(item);
                return (
                  <label
                    key={`${id}-${item}`}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 cursor-pointer
                      text-[14px] hover:bg-[#F8F9FA] transition-colors
                      ${isSel ? "bg-[#E8F0FE]" : ""}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(item)}
                      className="accent-[#1A56DB] w-4 h-4 shrink-0"
                    />
                    <span className="truncate">{item}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-[#E9ECEF] bg-[#F8F9FA]">
              <span className="text-[12px] text-[#6C757D]">
                {selected.length} selected
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[12px] text-[#DC3545] hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
