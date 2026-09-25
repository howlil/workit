import { useState, useEffect, useRef } from "react";
import type { SearchResultItem, SearchResultType } from "@workit/contracts";
import { workitApiClient } from "../runtime/api-client";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (item: SearchResultItem) => void;
}

type FilterScope = "all" | SearchResultType;

const FILTER_SCOPES: Array<{ id: FilterScope; label: string }> = [
  { id: "all", label: "All" },
  { id: "opportunity", label: "Jobs" },
  { id: "answer", label: "Answers" },
  { id: "profile", label: "Profile" },
];

export function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectResult,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [activeScope, setActiveScope] = useState<FilterScope>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener("keydown", handleEscape);
      return () => {
        window.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    let active = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const found = await workitApiClient.searchGlobal(trimmed);
        if (active) {
          setResults(found);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("[Workit] Global search error:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  const filteredResults = results.filter((item) => {
    if (activeScope === "all") return true;
    return item.type === activeScope;
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredResults[selectedIndex];
      if (current) {
        onSelectResult(current);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="global-search-backdrop"
      data-testid="global-search-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "80px",
      }}
    >
      <div
        className="global-search-dialog"
        style={{
          width: "100%",
          maxWidth: "620px",
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid var(--color-border, #e2e8f0)",
          overflow: "hidden",
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            gap: "10px",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "#64748b" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            data-testid="global-search-input"
            type="text"
            className="form-input"
            value={query}
            placeholder="Search opportunities, answers, or profile (⌘K)..."
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: "15px",
              padding: "0",
              boxShadow: "none",
            }}
          />
          <kbd
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#f1f5f9",
              color: "#64748b",
              border: "1px solid #cbd5e1",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Filter Scope Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            background: "#f8fafc",
          }}
        >
          {FILTER_SCOPES.map((scope) => (
            <button
              key={scope.id}
              type="button"
              data-testid={`search-filter-${scope.id}`}
              onClick={() => {
                setActiveScope(scope.id);
                setSelectedIndex(0);
              }}
              style={{
                fontSize: "12px",
                fontWeight: 500,
                padding: "3px 10px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                background: activeScope === scope.id ? "#2F7D44" : "transparent",
                color: activeScope === scope.id ? "#ffffff" : "#64748b",
              }}
            >
              {scope.label}
            </button>
          ))}
          {isLoading && (
            <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "auto" }}>
              Searching...
            </span>
          )}
        </div>

        {/* Results List */}
        <div
          data-testid="search-results-list"
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {query.trim().length > 0 && filteredResults.length === 0 && !isLoading && (
            <div
              data-testid="search-empty-state"
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              No matching results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.trim().length === 0 && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              Type a title, company, question, or skill to search across Workit...
            </div>
          )}

          {filteredResults.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={`${item.type}_${item.id}_${idx}`}
                data-testid="search-result-item"
                data-result-type={item.type}
                onClick={() => {
                  onSelectResult(item);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  background: isSelected ? "var(--color-surface-hover, #f1f5f9)" : "transparent",
                  borderLeft: isSelected ? "3px solid #2F7D44" : "3px solid transparent",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background:
                      item.type === "opportunity"
                        ? "#dcfce7"
                        : item.type === "answer"
                        ? "#e0e7ff"
                        : "#fef3c7",
                    color:
                      item.type === "opportunity"
                        ? "#166534"
                        : item.type === "answer"
                        ? "#3730a3"
                        : "#92400e",
                    marginTop: "2px",
                  }}
                >
                  {item.type === "opportunity" ? "Job" : item.type}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "1px",
                    }}
                  >
                    {item.subtitle}
                  </div>
                  {item.snippet && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                        marginTop: "3px",
                        fontStyle: "italic",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.snippet}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Keyboard hints footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "8px 16px",
            borderTop: "1px solid var(--color-border, #e2e8f0)",
            background: "#f8fafc",
            fontSize: "11px",
            color: "#94a3b8",
          }}
        >
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate</span>
          <span><strong>↵</strong> to select</span>
          <span><strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
}
