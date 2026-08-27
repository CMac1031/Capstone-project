/**
 * Profile.tsx
 *
 * Displays a customer's profile (name, account status, email, phone),
 * plus a form to record a new interaction (call/email/note/meeting).
 * Fetches the customer whenever `customerId` changes. Admins can edit
 * profile fields inline, with a single Save/Cancel pair for the whole form.
 *
 * onBack returns to the customer list -- this screen no longer lives
 * inside the old Search+Profile split layout, so it needs its own way
 * back.
 */

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth.tsx";
import type Customer from "../types/Customer.ts";
import { type AccountStatus, ACCOUNT_STATUSES } from "../types/Customer.ts";
import "../styles/Profile.css";

interface ProfileProps {
  customerId: string;
  onBack: () => void;
}

interface EditableFields {
  name: string;
  email: string;
  phone: string;
  accountStatus: AccountStatus;
}

type InteractionType = "CALL" | "EMAIL" | "NOTE" | "MEETING";
const INTERACTION_TYPES: InteractionType[] = ["CALL", "EMAIL", "NOTE", "MEETING"];

function toEditableFields(customer: Customer): EditableFields {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    accountStatus: customer.accountStatus,
  };
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // not JSON -- fall through
  }
  return fallback;
}

export default function Profile({ customerId, onBack }: ProfileProps) {
  const { isAdmin, user } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // --- interaction logging state ---
  const [interactionType, setInteractionType] = useState<InteractionType>("NOTE");
  const [summary, setSummary] = useState("");
  const [isLoggingInteraction, setIsLoggingInteraction] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [lastInteraction, setLastInteraction] = useState<{
    id: string;
    correlationId: string;
    interactionType: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomer(null);
    setIsEditing(false);
    setDraft(null);
    setSaveError(null);
    setLoadError(null);
    setLastInteraction(null);
    setInteractionError(null);

    if (!customerId) return;

    async function fetchCustomer() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/customers/${customerId}`, {
          headers: { Authorization: `Bearer ${user.jwt}` },
        });
        if (!res.ok) throw new Error("Customer not found.");
        const data: Customer = await res.json();
        if (!cancelled) setCustomer(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load customer.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchCustomer();
    return () => {
      cancelled = true;
    };
  }, [customerId, user.jwt]);

  const startEditing = () => {
    if (!customer) return;
    setDraft(toEditableFields(customer));
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(null);
    setSaveError(null);
    setIsEditing(false);
  };

  const updateDraftField = (field: keyof EditableFields, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveEditing = async () => {
    if (!draft || !customer) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/customers/${customer.customerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.jwt}`,
        },
        body: JSON.stringify(draft),
      });

      if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to save changes.");
        throw new Error(message);
      }

      const updated: Customer = await res.json();
      setCustomer(updated);
      setIsEditing(false);
      setDraft(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Records an interaction -- this is what actually triggers the backend's
  // Kafka publish (AFTER the DB save commits; see ADR-003). The frontend
  // doesn't talk to Kafka directly, it just calls this REST endpoint.
  const submitInteraction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customer) return;
    setIsLoggingInteraction(true);
    setInteractionError(null);
    setLastInteraction(null);

    try {
      const res = await fetch("/api/v1/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.jwt}`,
        },
        body: JSON.stringify({
          customerId: customer.customerId,
          interactionType,
          summary,
        }),
      });

      if (!res.ok) {
        const message = await extractErrorMessage(res, "Couldn't log the interaction.");
        throw new Error(message);
      }

      const created = await res.json();
      setLastInteraction({
        id: created.id,
        correlationId: created.correlationId,
        interactionType: created.interactionType,
      });
      setSummary("");
    } catch (err) {
      setInteractionError(err instanceof Error ? err.message : "Couldn't log the interaction.");
    } finally {
      setIsLoggingInteraction(false);
    }
  };

  return (
      <div className="profile-screen">
        <button type="button" className="profile-back-link" onClick={onBack}>
          &larr; Back to customers
        </button>

        {isLoading && <div className="profile-card profile-state">Loading customer...</div>}

        {loadError && <div className="profile-card profile-state profile-state--error">{loadError}</div>}

        {!isLoading && !loadError && customer && (
            <>
              <div className="profile-card">
                <div className="profile-header">
                  <h2 className="profile-title">{customer.customerId}</h2>
                  {isAdmin && !isEditing && (
                      <button type="button" className="profile-edit-button" onClick={startEditing}>
                        Edit
                      </button>
                  )}
                </div>

                <div className="profile-fields">
                  <ProfileField
                      label="Name"
                      value={isEditing && draft ? draft.name : customer.name}
                      isEditing={isEditing}
                      onChange={(v) => updateDraftField("name", v)}
                  />
                  <ProfileField
                      label="Email"
                      value={isEditing && draft ? draft.email : customer.email}
                      isEditing={isEditing}
                      type="email"
                      onChange={(v) => updateDraftField("email", v)}
                  />
                  <ProfileField
                      label="Phone"
                      value={isEditing && draft ? draft.phone : customer.phone}
                      isEditing={isEditing}
                      type="tel"
                      onChange={(v) => updateDraftField("phone", v)}
                  />

                  <div className="profile-field">
                    <span className="profile-field-label">Account Status</span>
                    {isEditing && draft ? (
                        <select
                            className="profile-field-input"
                            value={draft.accountStatus}
                            onChange={(e) => updateDraftField("accountStatus", e.target.value)}
                        >
                          {ACCOUNT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                          ))}
                        </select>
                    ) : (
                        <span className={`profile-status-badge profile-status-badge--${customer.accountStatus.toLowerCase()}`}>
                    {customer.accountStatus}
                  </span>
                    )}
                  </div>
                </div>

                {saveError && <p className="profile-error">{saveError}</p>}

                {isEditing && (
                    <div className="profile-actions">
                      <button type="button" className="profile-save-button" onClick={saveEditing} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                      <button type="button" className="profile-cancel-button" onClick={cancelEditing} disabled={isSaving}>
                        Cancel
                      </button>
                    </div>
                )}
              </div>

              <div className="profile-card profile-interaction-card">
                <h3 className="profile-interaction-title">Log an interaction</h3>
                <p className="profile-interaction-subtitle">
                  Saved to PostgreSQL first, then published to Kafka once the save commits.
                </p>

                <form onSubmit={submitInteraction} className="profile-interaction-form">
                  <label className="profile-field">
                    <span className="profile-field-label">Type</span>
                    <select
                        className="profile-field-input"
                        value={interactionType}
                        onChange={(e) => setInteractionType(e.target.value as InteractionType)}
                    >
                      {INTERACTION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                      ))}
                    </select>
                  </label>

                  <label className="profile-field">
                    <span className="profile-field-label">Summary</span>
                    <textarea
                        className="profile-interaction-textarea"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        required
                        maxLength={2000}
                        rows={3}
                    />
                  </label>

                  {interactionError && <p className="profile-error">{interactionError}</p>}

                  {lastInteraction && (
                      <div className="profile-interaction-success">
                        <p>
                          Logged <strong>{lastInteraction.interactionType}</strong> and published to Kafka.
                        </p>
                        <p className="profile-interaction-mono">correlationId: {lastInteraction.correlationId}</p>
                      </div>
                  )}

                  <button type="submit" className="profile-save-button" disabled={isLoggingInteraction}>
                    {isLoggingInteraction ? "Logging..." : "Log interaction"}
                  </button>
                </form>
              </div>
            </>
        )}
      </div>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  type?: string;
  onChange: (value: string) => void;
}

function ProfileField({ label, value, isEditing, type = "text", onChange }: ProfileFieldProps) {
  return (
      <div className="profile-field">
        <span className="profile-field-label">{label}</span>
        {isEditing ? (
            <input type={type} className="profile-field-input" value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
            <span className="profile-field-value">{value}</span>
        )}
      </div>
  );
}