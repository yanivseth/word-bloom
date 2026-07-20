import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import type { ChildProfile } from "~/types";

interface ChildSwitcherProps {
  children: ChildProfile[];
  activeChildId: number;
  onSwitch: (childId: number) => void;
  isPremium: boolean;
}

export function ChildSwitcher({
  children,
  activeChildId,
  onSwitch,
  isPremium,
}: ChildSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const activeChild = children.find((c) => c.id === activeChildId);
  const maxChildren = 5;
  const atMax = children.length >= maxChildren;
  const canAdd = isPremium ? !atMax : children.length < 1;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full bg-cream-200 px-3 py-1.5 text-xs font-medium text-sage-700 transition-colors hover:bg-cream-300 min-h-[44px]"
        aria-label="Switch child"
      >
        {activeChild ? (
          <>
            <span className="truncate max-w-[80px]">{activeChild.name}</span>
            <svg
              className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        ) : (
          "Select child"
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl border border-cream-200 bg-white shadow-lg p-1 animate-fade-in">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                onSwitch(child.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                child.id === activeChildId
                  ? "bg-lavender-100 text-lavender-800 font-medium"
                  : "text-gray-700 hover:bg-cream-50"
              }`}
            >
              <span className="truncate">{child.name}</span>
              {child.id === activeChildId && (
                <span className="ml-auto text-lavender-500 text-xs">✓</span>
              )}
            </button>
          ))}

          <div className="mt-1 border-t border-cream-200 pt-1">
            {canAdd ? (
              <Link
                to="/setup"
                search={{ new: "true" }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-lavender-600 font-medium hover:bg-lavender-50 transition-colors min-h-[44px]"
                onClick={() => setOpen(false)}
              >
                <span>+ Add Child</span>
              </Link>
            ) : !isPremium ? (
              <Link
                to="/pricing"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-lavender-600 font-medium hover:bg-lavender-50 transition-colors min-h-[44px]"
                onClick={() => setOpen(false)}
              >
                <span>🔒 Upgrade to add child</span>
              </Link>
            ) : (
              <span className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 min-h-[44px]">
                Max {maxChildren} children
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
