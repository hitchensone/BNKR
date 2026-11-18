import type { Tint } from "../../components/ui.tsx";

export type Priority = "baixa" | "normal" | "alta" | "urgente";

export interface TaskColumn {
  id: string;
  name: string;
  position: number;
  is_done: boolean;
  tint: Tint;
}

export interface Task {
  id: string;
  project_id: string;
  column_id: string;
  parent_id: string | null;
  stage_id: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  assignee_id: string | null;
  requested_by: string | null;
  due_date: string | null;
  position: number;
  visible_to_client: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
}

export interface StaffMember {
  user_id: string;
  full_name: string | null;
  role: "owner" | "admin" | "team";
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  items: TemplateItem[];
}

export interface TemplateItem {
  id: string;
  template_id: string;
  kind: "etapa" | "tarefa";
  title: string;
  stage_title: string | null;
  offset_days: number;
  priority: Priority;
  position: number;
}
