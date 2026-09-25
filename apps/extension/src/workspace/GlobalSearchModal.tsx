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
        backgroundColor: "rgba(0, 0, 0, 0.4)",
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
          background: "var(--white)",
          borderRadius: "var(--radius-popup)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid var(--line-strong)",
          overflow: "hidden",
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid var(--line)",
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
            style={{ color: "var(--text-muted)" }}
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
              fontSize: "14px",
              padding: "0",
              boxShadow: "none",
              color: "var(--text)",
            }}
          />
          <kbd
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "var(--radius-chip)",
              background: "var(--hover)",
              color: "var(--text-muted)",
              border: "1px solid var(--line)",
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
            gap: "6px",
            padding: "8px 16px",
            borderBottom: "1px solid var(--line)",
            background: "var(--hover)",
          }}
        >
          {FILTER_SCOPES.map((scope) => (
            <button
              key={scope.id}
              type="button"
              className={`filter-chip ${activeScope === scope.id ? "is-active" : ""}`}
              data-testid={`search-filter-${scope.id}`}
              onClick={() => {
                setActiveScope(scope.id);
                setSelectedIndex(0);
              }}
              style={{
                fontSize: "12px",
                padding: "3px 10px",
                cursor: "pointer",
              }}
            >
              {scope.label}
            </button>
          ))}
          {isLoading && (
            <span style={{ fontSize: "11px", color: "var(--text-faint)", marginLeft: "auto" }}>
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
                color: "var(--text-muted)",
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
                color: "var(--text-faint)",
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
                  background: isSelected ? "var(--green-soft)" : "transparent",
                  boxShadow: isSelected ? "inset 2px 0 0 var(--green)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-chip)",
                    background: item.type === "opportunity" ? "var(--green-soft)" : "var(--hover)",
                    color: item.type === "opportunity" ? "var(--green)" : "var(--text-muted)",
                    border: item.type === "opportunity" ? "1px solid var(--green-line)" : "1px solid var(--line)",
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
                      color: "var(--text)",
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
                      color: "var(--text-muted)",
                      marginTop: "1px",
                    }}
                  >
                    {item.subtitle}
                  </div>
                  {item.snippet && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-faint)",
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
            borderTop: "1px solid var(--line)",
            background: "var(--hover)",
            fontSize: "11px",
            color: "var(--text-faint)",
          }}
        >
          <span>Use <strong style={{ color: "var(--text-muted)" }}>↑</strong> <strong style={{ color: "var(--text-muted)" }}>↓</strong> to navigate</span>
          <span><strong style={{ color: "var(--text-muted)" }}>↵</strong> to select</span>
          <span><strong style={{ color: "var(--text-muted)" }}>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
}
