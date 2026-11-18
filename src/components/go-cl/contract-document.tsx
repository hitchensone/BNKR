import type { ReactNode } from "react";

// Renderiza o texto do contrato (Markdown simples do modelo) como documento.
// Suporta: # título, ## cláusula, **negrito**, *itálico*, listas "- ",
// linhas de assinatura "____" e "&nbsp;" como espaço. Todo texto passa
// pelo React, então nada do conteúdo vira HTML executável.

function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={`${key}-${i}`}>{p.slice(1, -1)}</em>;
    // "____" é campo sem dado: destaca na tela, some na impressão como linha.
    return p.split(/(_{4,})/g).map((s, j) =>
      /^_{4,}$/.test(s) && s.length < 10 ? (
        <mark key={`${key}-${i}-${j}`} className="contract-blank">{s}</mark>
      ) : (
        s
      ),
    );
  });
}

function renderBlock(block: string, key: string): ReactNode {
  const lines = block.split("\n");
  const first = lines[0].trim();

  if (first === "&nbsp;") return <div key={key} className="h-6" aria-hidden />;
  if (first.startsWith("# ")) return <h1 key={key}>{inline(first.slice(2), key)}</h1>;
  if (first.startsWith("## ")) return <h2 key={key}>{inline(first.slice(3), key)}</h2>;
  if (lines.every((l) => l.trim().startsWith("- "))) {
    return (
      <ul key={key}>
        {lines.map((l, i) => <li key={i}>{inline(l.trim().slice(2), `${key}-${i}`)}</li>)}
      </ul>
    );
  }
  if (/^_{10,}$/.test(first)) {
    return (
      <div key={key} className="contract-sign">
        <div className="contract-sign-line" />
        {lines.slice(1).map((l, i) => <p key={i}>{inline(l, `${key}-${i}`)}</p>)}
      </div>
    );
  }
  return (
    <p key={key}>
      {lines.map((l, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {inline(l, `${key}-${i}`)}
        </span>
      ))}
    </p>
  );
}

export function ContractDocument({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\s*\n/);

  // Cada cláusula (título "## " + texto até a próxima) vira uma seção,
  // para a impressão não separar o título do seu texto.
  const sections: string[][] = [[]];
  for (const block of blocks) {
    if (block.trim().startsWith("## ") || /^&nbsp;$/.test(block.trim())) sections.push([]);
    sections[sections.length - 1].push(block);
  }

  return (
    <article className="contract-doc">
      {sections.filter((s) => s.length).map((sec, i) => (
        <section key={i} className="contract-clause">
          {sec.map((block, b) => renderBlock(block, `s${i}b${b}`))}
        </section>
      ))}
    </article>
  );
}
