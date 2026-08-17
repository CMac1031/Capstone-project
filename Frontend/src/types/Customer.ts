
export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";

export const ACCOUNT_STATUSES: AccountStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "PENDING",
];

export default interface Customer {
  customerId: string; // format: CUS-xxxx (4 digits)
  name: string;
  email: string;
  phone: string;
  accountStatus: AccountStatus;
}

// CUS- followed by exactly 4 digits, e.g. CUS-0231
const CUSTOMER_ID_PATTERN = /^CUS-\d{4}$/;

export function isValidCustomerId(value: string): boolean {
  return CUSTOMER_ID_PATTERN.test(value);
}