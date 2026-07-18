"use client";

import { useEffect, useRef, useState } from "react";

/** Shape of a row from GET /api/registry — the public rating list. */
interface Candidate {
  id: string;
  source: "nsf" | "fide";
  name: string;
  club?: string;
  federation?: string;
  rating: number | null;
  fideId?: string;
  birthYear?: number;
}

/** "rating · klubb", dropping whichever part is missing. */
function detail(c: Candidate): string {
  return [c.rating !== null ? String(c.rating) : null, c.club].filter(Boolean).join(" · ");
}

/**
 * Autocomplete over the rating list for the public signup form. The same
 * text input doubles as the free-form name field: when no candidate is
 * selected, its value is submitted as `name`; a selected candidate submits
 * its id as `registryId` (the server re-resolves it).
 */
export function PlayerLookup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [open, setOpen] = useState(false);
  const [extended, setExtended] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const url = `/api/registry?q=${encodeURIComponent(q)}${extended ? "&extended=1" : ""}`;
      fetch(url, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: Candidate[]) => {
          setResults(rows);
          setSearched(true);
          setHighlight(-1);
        })
        .catch(() => {
          /* aborted or offline — leave the last results in place */
        });
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, extended, selected]);

  function choose(c: Candidate) {
    setSelected(c);
    setOpen(false);
    setResults([]);
    setHighlight(-1);
  }

  function reset() {
    setSelected(null);
    setQuery("");
    setResults([]);
    setSearched(false);
    setOpen(true);
    // Refocus so the arbiter can keep typing after "Endre".
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (selected) {
    return (
      <div className="lookup">
        <input type="hidden" name="registryId" value={selected.id} />
        <span className="lookup-label muted">Navn</span>
        <div className="lookup-chosen">
          <span>
            {selected.name}
            {detail(selected) ? <span className="muted"> — {detail(selected)}</span> : null}
          </span>
          <button type="button" onClick={reset}>
            Endre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lookup">
      <label>
        Navn
        <input
          ref={inputRef}
          name="name"
          value={query}
          autoComplete="off"
          placeholder="Etternavn, Fornavn"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && highlight >= 0 && results[highlight]) {
              // Select rather than submit while a candidate is highlighted.
              e.preventDefault();
              choose(results[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </label>

      {open && results.length > 0 && (
        <ul className="lookup-list">
          {results.map((c, i) => (
            <li key={`${c.source}:${c.id}`}>
              <button
                type="button"
                className={i === highlight ? "is-active" : undefined}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(c)}
              >
                <span>{c.name}</span>
                {detail(c) ? <span className="muted">{detail(c)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="lookup-aux">
        <button
          type="button"
          className="linklike"
          onClick={() => setExtended((v) => !v)}
        >
          {extended ? "Vanlig søk" : "Utvidet søk"}
        </button>
        {searched && results.length === 0 && (
          <span className="muted">Ingen treff i ratinglisten</span>
        )}
      </div>

      <label>
        Rating
        <input name="rating" type="number" min={0} max={4000} placeholder="Valgfritt" />
      </label>
      <label>
        Klubb
        <input name="club" placeholder="Valgfritt" />
      </label>
    </div>
  );
}
