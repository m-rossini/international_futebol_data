'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface Props {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  multi?: boolean;
  /** Optional render function for each item (both chip & dropdown). */
  renderItem?: (item: string) => React.ReactNode;
}

export function AutocompleteInput({
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  multi = true,
  renderItem,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(
    (o) => !selected.includes(o) && o.toLowerCase().includes(query.toLowerCase()),
  );

  const addItem = useCallback(
    (item: string) => {
      if (multi) {
        onChange([...selected, item]);
      } else {
        onChange([item]);
        setOpen(false);
      }
      setQuery('');
      setHighlight(0);
    },
    [multi, selected, onChange],
  );

  const removeItem = useCallback(
    (item: string) => {
      onChange(selected.filter((s) => s !== item));
    },
    [selected, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlight]) {
      e.preventDefault();
      addItem(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="flex items-center gap-1 min-h-[36px] px-2 py-1 border border-gray-300 rounded-lg bg-white cursor-text focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selected.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full"
          >
            {renderItem ? renderItem(item) : item}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item);
              }}
              className="hover:text-blue-900"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent py-0.5"
          placeholder={selected.length === 0 ? placeholder : ''}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.map((item, i) => (
            <li
              key={item}
              className={`px-3 py-1.5 text-sm cursor-pointer ${
                i === highlight ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => addItem(item)}
            >
              {renderItem ? renderItem(item) : item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
