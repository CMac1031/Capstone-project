/**
 * Profile.tsx
 *
 * Displays a customer's profile (name, account status, email, phone).
 * Fetches the customer whenever `customerId` changes. Admins can edit all
 * fields inline, with a single Save/Cancel pair for the whole form.
 */

import { useEffect, useId, useState } from "react";
import { useAuth } from "../hooks/useAuth.tsx";
import type Customer from "../types/Customer.ts";
import { type AccountStatus, ACCOUNT_STATUSES } from "../types/Customer.ts";
import { newCorrelationId } from "../utils/correlation";
import "../styles/Profile.css";

interface ProfileProps {
  customerId: string;
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

export default function Profile({ customerId }: ProfileProps) {
  const { isAdmin, user } = useAuth();
  const statusFieldId = useId();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch the customer whenever the selected ID changes.
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
          headers: {
            Authorization: `Bearer ${user.jwt}`,
            "X-Correlation-Id": newCorrelationId(),
          },
        });
        if (!res.ok) throw new Error("Customer not found.");
        const data: Customer = await res.json();
        if (!cancelled) setCustomer(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
              err instanceof Error ? err.message : "Failed to load customer."
          );
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
          "X-Correlation-Id": newCorrelationId(),
        },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to save changes.");
      const updated: Customer = await res.json();
      setCustomer(updated);
      setIsEditing(false);
      setDraft(null);
    } catch (err) {
      setSaveError(
          err instanceof Error ? err.message : "Failed to save changes."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    // role="status" + aria-live: a screen reader announces this without the
    // user having to go looking for it.
    return (
        <div
            className="profile-panel-inner profile-state"
            role="status"
            aria-live="polite"
        >
          Loading customer...
        </div>
    );
  }

  if (loadError) {
    // role="alert" is assertive - a failed lookup interrupts, because the user
    // is otherwise left staring at an empty panel wondering what happened.
    return (
        <div
            className="profile-panel-inner profile-state profile-state--error"
            role="alert"
        >
          {loadError}
        </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
      <section
          className="profile-panel-inner"
          aria-label={`Customer profile for ${customer.customerId}`}
          aria-busy={isSaving}
      >
        <div className="profile-header">
          <h2 className="profile-title">{customer.customerId}</h2>
          {isAdmin && !isEditing && (
              <button
                  type="button"
                  className="profile-edit-button"
                  onClick={startEditing}
              >
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
            <label className="profile-field-label" htmlFor={statusFieldId}>
              Account Status
            </label>
            {isEditing && draft ? (
                <select
                    id={statusFieldId}
                    className="profile-field-input"
                    value={draft.accountStatus}
                    onChange={(e) =>
                        updateDraftField("accountStatus", e.target.value)
                    }
                >
                  {ACCOUNT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                  ))}
                </select>
            ) : (
                // The badge carries meaning in colour AND text. Colour alone would
                // exclude anyone who cannot distinguish it, and would not survive a
                // screenshot in a support ticket.
                <span
                    id={statusFieldId}
                    className={`profile-status-badge profile-status-badge--${customer.accountStatus.toLowerCase()}`}
                >
              {customer.accountStatus}
            </span>
            )}
          </div>
        </div>

        {saveError && (
            <p className="profile-error" role="alert">
              {saveError}
            </p>
        )}

        {isEditing && (
            <div className="profile-actions">
              <button
                  type="button"
                  className="profile-save-button"
                  onClick={saveEditing}
                  disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={cancelEditing}
                  disabled={isSaving}
              >
                Cancel
              </button>
            </div>
        )}
      </section>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  type?: string;
  onChange: (value: string) => void;
}

function ProfileField({
                        label,
                        value,
                        isEditing,
                        type = "text",
                        onChange,
                      }: ProfileFieldProps) {
  // useId gives a stable, collision-free id per rendered field, so the label
  // and its input are genuinely associated rather than just visually adjacent.
  const fieldId = useId();

  return (
      <div className="profile-field">
        <label className="profile-field-label" htmlFor={fieldId}>
          {label}
        </label>
        {isEditing ? (
            <input
                id={fieldId}
                type={type}
                className="profile-field-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        ) : (
            <span id={fieldId} className="profile-field-value">
          {value}
        </span>
        )}
      </div>
  );
}