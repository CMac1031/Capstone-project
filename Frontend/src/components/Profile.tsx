/**
 * Profile.tsx
 *
 * Displays a customer's profile (name, account status, email, phone).
 * Fetches the customer whenever `customerId` changes. Admins can edit all
 * fields inline, with a single Save/Cancel pair for the whole form.
 *
 * onBack returns to the customer list -- this screen no longer lives
 * inside the old Search+Profile split layout, so it needs its own way
 * back.
 */

import { useEffect, useState } from "react";
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

function toEditableFields(customer: Customer): EditableFields {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    accountStatus: customer.accountStatus,
  };
}

// Pulls a readable message out of the backend's error JSON.
// Handles two shapes we might get back:
//  - ApiExceptionHandler's ProblemDetail: { detail: "..." }
//  - Spring's default Bean Validation failure: { errors: [{ defaultMessage: "..." }] }
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.errors) && body.errors[0]?.defaultMessage) {
      return body.errors[0].defaultMessage;
    }
  } catch {
    // response wasn't JSON -- fall through to the generic message
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

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomer(null);
    setIsEditing(false);
    setDraft(null);
    setSaveError(null);
    setLoadError(null);

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

  return (
      <div className="profile-screen">
        <button type="button" className="profile-back-link" onClick={onBack}>
          &larr; Back to customers
        </button>

        {isLoading && <div className="profile-card profile-state">Loading customer...</div>}

        {loadError && <div className="profile-card profile-state profile-state--error">{loadError}</div>}

        {!isLoading && !loadError && customer && (
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