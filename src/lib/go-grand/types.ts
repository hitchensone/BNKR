import type { Kind } from "./categories";

export interface Transaction {
  id: string;
  kind: Kind;
  category: string;
  description: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  paid_at: string | null;
  payment_method: string | null;
  client_id: string | null;
  contract_id: string | null;
  recurring_id: string | null;
  notes: string | null;
}

export interface RecurringItem {
  id: string;
  kind: Kind;
  category: string;
  description: string;
  amount: number;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  contract_id: string | null;
  active: boolean;
  notes: string | null;
}
