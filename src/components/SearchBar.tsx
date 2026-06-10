"use client";

import { useEffect, useState } from "react";

interface SearchBarProps {
  medications: string[];
  onChange: (medications: string[]) => void;
  /** true si le stock est simulé (mock) — change la précision du label. */
  mocked?: boolean;
}

/**
 * Saisie multi-médicaments sous forme de « chips » (comme les lignes d'une
 * ordonnance), avec AUTOCOMPLÉTION sur le référentiel réel BDPM
 * (via /api/medications). On peut choisir une suggestion (clic / flèches + Entrée)
 * ou saisir un nom libre (Entrée / virgule).
 */
export default function SearchBar({ medications, onChange, mocked = true }: SearchBarProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Autocomplétion : interroge le référentiel (débounce léger). Toutes les
  // mises à jour d'état se font dans le callback asynchrone (pas dans le corps
  // de l'effet), et sont protégées par un drapeau `active` contre les courses.
  useEffect(() => {
    const q = input.trim();
    let active = true;
    const t = setTimeout(async () => {
      if (q.length < 1) {
        if (active) setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/medications?q=${encodeURIComponent(q)}`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;
        setSuggestions(data.suggestions ?? []);
        setActiveIndex(-1);
        setOpen(true);
      } catch {
        /* ignore : l'autocomplétion est non bloquante */
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [input]);

  function addMedication(value: string) {
    const v = value.trim();
    if (!v) return;
    if (!medications.some((m) => m.toLowerCase() === v.toLowerCase())) {
      onChange([...medications, v]);
    }
    setInput("");
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function removeMedication(index: number) {
    onChange(medications.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        addMedication(suggestions[activeIndex]);
      } else {
        addMedication(input); // nom libre
      }
    } else if (e.key === ",") {
      e.preventDefault();
      addMedication(input);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && input === "" && medications.length > 0) {
      removeMedication(medications.length - 1);
    }
  }

  return (
    <div>
      <label htmlFor="medication-input" className="block text-sm font-medium text-gray-700">
        Médicament(s) recherché(s)
      </label>
      <p id="medication-help" className="mb-1 text-xs text-gray-500">
        {mocked
          ? "Suggestions issues de la base publique des médicaments (BDPM). Disponibilité simulée (démonstration)."
          : "Suggestions BDPM. Recherche par nom dans le catalogue réel de chaque pharmacie."}
      </p>

      <div className="flex flex-wrap gap-1.5 rounded border border-gray-300 p-2 focus-within:border-blue-500">
        {medications.map((m, i) => (
          <span
            key={`${m}-${i}`}
            className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-sm text-blue-800"
          >
            {m}
            <button
              type="button"
              onClick={() => removeMedication(i)}
              aria-label={`Retirer ${m}`}
              className="text-blue-500 hover:text-blue-800"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="medication-input"
          type="text"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="medication-suggestions"
          aria-describedby="medication-help"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={medications.length === 0 ? "ex. Doliprane…" : "Ajouter…"}
          className="min-w-[8rem] flex-1 border-0 text-sm focus:outline-none focus:ring-0"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id="medication-suggestions"
          role="listbox"
          className="mt-1 max-h-56 overflow-y-auto rounded border border-gray-200 bg-white text-sm shadow"
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIndex}
              // onMouseDown (avant blur) pour que le clic enregistre la sélection.
              onMouseDown={(e) => {
                e.preventDefault();
                addMedication(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`cursor-pointer px-3 py-1.5 ${
                i === activeIndex ? "bg-blue-50 text-blue-800" : "hover:bg-gray-50"
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
