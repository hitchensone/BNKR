export type ProjectStatus = "planejamento" | "em_andamento" | "pausado" | "concluido" | "cancelado";

export interface PortalProject {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  starts_on: string | null;
  ends_on: string | null;
  visible_to_client: boolean;
  client: { name: string; trade_name: string | null } | null;
}

export type StageStatus = "pendente" | "em_andamento" | "concluida";

export interface Stage {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  position: number;
  status: StageStatus;
  due_date: string | null;
  completed_at: string | null;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  body: string;
  created_at: string;
  author: string | null;
}

export type RequestDirection = "agencia_pede" | "cliente_pede";
export type RequestStatus = "aberto" | "respondido" | "concluido";

export interface FileRequest {
  id: string;
  project_id: string;
  direction: RequestDirection;
  title: string;
  description: string | null;
  status: RequestStatus;
  due_date: string | null;
  created_at: string;
}

export interface PortalFile {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: "interno" | "cliente";
  request_id: string | null;
  created_at: string;
  uploaded_by: string | null;
  url: string | null; // link assinado e temporário para baixar
}

export interface ClientUser {
  user_id: string;
  name: string | null;
}
