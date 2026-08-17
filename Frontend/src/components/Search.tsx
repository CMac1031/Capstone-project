/**
 * SearchBar.tsx
 *
 * Search bar for looking up a customer by ID (format CUS-xxxx).
 *
 * All customer IDs are fetched once (while authenticated) and suggestion
 * matching happens client-side against that cached list, per the "fetch
 * once, filter on the frontend" approach.
 *
 * - Disabled entirely when the user is not authenticated.
 * - Up to 3 suggestions are shown, recomputed on every keystroke against
 *   the current input value.
 * - Clicking a suggestion, or pressing Enter with a valid ID typed in,
 *   immediately triggers onCustomerSelected.
 */

import React, { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useAuth } from "../hooks/useAuth.tsx";
import { isValidCustomerId } from "../types/Customer.ts";
import "./SearchBar.css";

// Adjust to your real endpoint. Expected response: string[] of customer IDs.
const CUSTOMER_IDS_ENDPOINT = "/api/customers/ids";
const MAX_SUGGESTIONS = 3;

interface SearchBarProps {
  onCustomerSelected: (customerId: string) => void;
}

export default function Search({ onCustomerSelected }: SearchBarProps) {
  const { isAuthenticated, user } = useAuth();

  const [allCustomerIds, setAllCustomerIds] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch the full list of customer IDs once, whenever the user becomes
  // authenticated. This avoids a request per keystroke.
  useEffect(() => {
    if (!isAuthenticated) {
      setAllCustomerIds([]);
      return;
    }

    let cancelled = false;

    async function fetchCustomerIds() {
      try {
        const res = await fetch(CUSTOMER_IDS_ENDPOINT, {
          headers: { Authorization: `Bearer ${user.jwt}` },
        });
        if (!res.ok) throw new Error("Failed to load customer IDs.");
        const ids: string[] = await res.json();
        if (!cancelled) setAllCustomerIds(ids);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setAllCustomerIds([]);
        }
      }
    }

    fetchCustomerIds();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user.jwt]);

  // On logout: clear the field, suggestions, and any error so the bar
  // is fully reset by the time it re-disables.
  useEffect(() => {
    if (!isAuthenticated) {
      setValue("");
      setSuggestions([]);
      setError(null);
    }
  }, [isAuthenticated]);

  const computeSuggestions = (query: string): string[] => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return [];

    return allCustomerIds
      .filter((id) => id.toUpperCase().includes(trimmed))
      .sort()
      .slice(0, MAX_SUGGESTIONS);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setError(null);
    setSuggestions(computeSuggestions(newValue));
  };

  const runSearch = (rawId: string) => {
    const candidateId = rawId.trim().toUpperCase();

    if (!isValidCustomerId(candidateId)) {
      setError("Customer ID must look like CUS-1234.");
      return;
    }

    setError(null);
    setSuggestions([]);
    setValue(candidateId);
    onCustomerSelected(candidateId);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch(value);
    }
  };

  return (
    <div className="search-bar">
      <div className="search-input-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search customer ID (CUS-1234)"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={!isAuthenticated}
          aria-label="Customer ID search"
        />
        <button
          type="button"
          className="search-button"
          onClick={() => runSearch(value)}
          disabled={!isAuthenticated}
        >
          Search
        </button>
      </div>

      {error && <p className="search-error">{error}</p>}

      {suggestions.length > 0 && (
        <ul className="search-suggestions">
          {suggestions.map((id) => (
            <li key={id}>
              <button
                type="button"
                className="search-suggestion-item"
                onClick={() => runSearch(id)}
              >
                {id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}