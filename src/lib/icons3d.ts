// Ícones 3D disponíveis em /public/icons/3d (Fluent Emoji 3D, Microsoft, licença MIT).
// A chave é o código do emoji em hexadecimal, sem o seletor de variação (FE0F).

export const ICONS_3D: ReadonlySet<string> = new Set(["1f310", "1f324", "1f389", "1f39e", "1f3a5", "1f3a8", "1f3ac", "1f3af", "1f3b5", "1f3c6", "1f3e0", "1f3e2", "1f3e6", "1f3f7", "1f441", "1f44b", "1f44d", "1f45b", "1f464", "1f465", "1f4a1", "1f4ac", "1f4b0", "1f4b3", "1f4b5", "1f4b8", "1f4bb", "1f4bc", "1f4c1", "1f4c4", "1f4c5", "1f4c6", "1f4c7", "1f4c8", "1f4c9", "1f4ca", "1f4cb", "1f4cc", "1f4cd", "1f4ce", "1f4d2", "1f4d5", "1f4dd", "1f4de", "1f4e2", "1f4e3", "1f4e5", "1f4e6", "1f4f8", "1f501", "1f50d", "1f510", "1f511", "1f512", "1f514", "1f525", "1f534", "1f535", "1f590", "1f5a8", "1f5bc", "1f5c2", "1f5d2", "1f5d3", "1f5fa", "1f648", "1f64b", "1f680", "1f6e0", "1f6f0", "1f7e0", "1f7e1", "1f7e2", "1f7e3", "1f916", "1f91d", "1f9d1", "1f9e0", "1f9e9", "1f9ed", "1f9ee", "1f9f5", "1f9fe", "23f0", "23f3", "2699", "26a0", "26a1", "2705", "2709", "270d", "270f", "2744", "2795", "2796", "2b50"]);

/** "🛰️" → "1f6f0" (ou null se não houver ícone 3D para ele). */
export function icon3dKey(text: string): string | null {
  const t = text.trim();
  if (!t || t.length > 8) return null;
  const key = [...t].filter((c) => c !== "\uFE0F").map((c) => c.codePointAt(0)!.toString(16)).join("-");
  return ICONS_3D.has(key) ? key : null;
}
