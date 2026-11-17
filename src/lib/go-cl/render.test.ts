import { test } from "node:test";
import assert from "node:assert/strict";
import { contractValuesText, fillTemplate, scopeFromBriefing, whatsappLink } from "./render.ts";

test("preenche variáveis e marca as vazias", () => {
  assert.equal(fillTemplate("Oi {{contato}}, {{empresa}}!", { contato: "Ana", empresa: "" }), "Oi Ana, ____!");
});

test("texto de valores do contrato misto", () => {
  const t = contractValuesText({ billing_type: "misto", monthly_value: 1500, one_time_value: 800 });
  assert.match(t, /mensal de R\$\s1\.500,00/);
  assert.match(t, /único de R\$\s800,00/);
});

test("escopo a partir do briefing", () => {
  const s = scopeFromBriefing({
    deliverables: [{ item: "Posts feed", quantidade: 12, periodicidade: "mensal" }],
    campaigns: [{ nome: "Natal", canais: ["Instagram", "Meta Ads"] }],
  });
  assert.equal(s, '- 12 × Posts feed (mensal)\n- Campanha "Natal" em Instagram, Meta Ads');
});

test("link de WhatsApp com DDI", () => {
  assert.ok(whatsappLink("(62) 99999-0000", "oi").startsWith("https://wa.me/5562999990000?text=oi"));
});
