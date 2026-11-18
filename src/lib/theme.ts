// Temas do sistema (escolhidos em Ajustes). O CSS de cada um está em app/globals.css.

export const THEMES = [
  { id: "padrao", name: "Padrão", description: "Fundo amarelo e cards brancos" },
  { id: "dark", name: "Dark mode", description: "Escuro, para a noite" },
  { id: "glass", name: "Just Glass", description: "Vidro transparente e limpo" },
  { id: "glass-ish", name: "Glass Ish", description: "Vidro fosco, mais leitura" },
  { id: "liquid", name: "Liquid Glass", description: "Vidro com refração, estilo Apple" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

export const THEME_STORAGE_KEY = "bnkr-tema";

/**
 * Roda no <head>, antes de pintar a tela: aplica o tema guardado no aparelho
 * (sem piscar) e marca o motor do navegador (a refração só existe no Chrome/Edge).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}var q=new URLSearchParams(location.search).get("tema");if(q)t=q;if(t&&t!=="padrao")d.setAttribute("data-theme",t);if(/Chrome\\//.test(navigator.userAgent))d.setAttribute("data-engine","chromium")}catch(e){}})();`;

/** Aplica o tema na página aberta e guarda no aparelho. */
export function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  if (theme === "padrao") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // modo anônimo ou armazenamento bloqueado: vale só nesta aba
  }
}
