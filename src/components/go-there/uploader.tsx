"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeFileName } from "@/lib/go-there/progress";
import { saveUploadedFile } from "@/app/(sistema)/go-there/actions";

/**
 * Envia arquivos direto do navegador para o armazenamento (sem passar
 * pelo servidor do app, então não há limite de tamanho dele) e depois
 * registra cada um no projeto.
 */
export function Uploader({
  projectId,
  clientId,
  requestId = null,
  allowInternal = false,
  label = "Enviar arquivos",
  compact = false,
}: {
  projectId: string;
  clientId: string;
  requestId?: string | null;
  allowInternal?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [visibility, setVisibility] = useState<"cliente" | "interno">("cliente");
  const [status, setStatus] = useState<{ busy: boolean; message?: string; error?: boolean }>({ busy: false });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const supabase = createClient();
    setStatus({ busy: true, message: `Enviando ${files.length} arquivo${files.length > 1 ? "s" : ""}...` });

    let failed = 0;
    for (const file of Array.from(files)) {
      const path = `${clientId}/${projectId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("arquivos").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) {
        failed++;
        continue;
      }
      const res = await saveUploadedFile({
        path,
        name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        project_id: projectId,
        request_id: requestId,
        visibility,
      });
      if (res.error) failed++;
    }

    if (input.current) input.current.value = "";
    setStatus(
      failed
        ? { busy: false, error: true, message: `${failed} arquivo${failed > 1 ? "s" : ""} não ${failed > 1 ? "foram enviados" : "foi enviado"}. Tente de novo.` }
        : { busy: false, message: "Enviado ✓" },
    );
    router.refresh();
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "rounded-[1.5rem] border-2 border-dashed border-border p-3"}`}>
      <input ref={input} type="file" multiple className="sr-only" id={`up-${projectId}-${requestId ?? "geral"}`}
        onChange={(e) => upload(e.target.files)} disabled={status.busy} />
      <label htmlFor={`up-${projectId}-${requestId ?? "geral"}`}
        className={`btn ${compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm"} btn-primary cursor-pointer ${status.busy ? "pointer-events-none opacity-60" : ""}`}>
        ⬆ {status.busy ? "Enviando..." : label}
      </label>
      {allowInternal && (
        <select value={visibility} onChange={(e) => setVisibility(e.target.value as "cliente" | "interno")}
          aria-label="Quem vê o arquivo" className="h-9 rounded-xl bg-tile px-2 text-xs font-semibold outline-none">
          <option value="cliente">Cliente vê</option>
          <option value="interno">Só a equipe</option>
        </select>
      )}
      {status.message && (
        <span role={status.error ? "alert" : "status"} className={`text-xs font-medium ${status.error ? "text-accent" : "text-ok"}`}>
          {status.message}
        </span>
      )}
    </div>
  );
}
