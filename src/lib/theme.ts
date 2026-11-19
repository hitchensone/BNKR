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

/* ---------- Cor do fundo (vale em todos os temas, menos no Dark) ---------- */
export const DEFAULT_WALLPAPER = "#fae04b";
export const WALLPAPERS = [
  { name: "Amarelo GO Bunker (padrão)", hex: DEFAULT_WALLPAPER },
  { name: "Turquoise", hex: "#1abc9c" },
  { name: "Emerald", hex: "#2ecc71" },
  { name: "Peter River", hex: "#3498db" },
  { name: "Amethyst", hex: "#9b59b6" },
  { name: "Wet Asphalt", hex: "#34495e" },
  { name: "Green Sea", hex: "#16a085" },
  { name: "Nephritis", hex: "#27ae60" },
  { name: "Belize Hole", hex: "#2980b9" },
  { name: "Wisteria", hex: "#8e44ad" },
  { name: "Midnight Blue", hex: "#2c3e50" },
  { name: "Sun Flower", hex: "#f1c40f" },
  { name: "Carrot", hex: "#e67e22" },
  { name: "Alizarin", hex: "#e74c3c" },
  { name: "Clouds", hex: "#ecf0f1" },
  { name: "Concrete", hex: "#95a5a6" },
  { name: "Orange", hex: "#f39c12" },
  { name: "Pumpkin", hex: "#d35400" },
  { name: "Pomegranate", hex: "#c0392b" },
  { name: "Silver", hex: "#bdc3c7" },
  { name: "Asbestos", hex: "#7f8c8d" },
] as const;
export const WALLPAPER_STORAGE_KEY = "bnkr-fundo";

/** Fundo escuro? (luminância relativa baixa): o vidro fica mais leitoso para o texto escuro continuar legível. */
export function isDarkWall(hex: string) {
  const c = hex.replace("#", "").match(/../g)!.map((x) => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 0.2;
}
/* versão compacta do isDarkWall para o script do <head> */
const WALL_DARK_TEST = `(function(h){var c=h.slice(1).match(/../g).map(function(x){var v=parseInt(x,16)/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]<.2})(f)`;

/** Aplica a cor do fundo na página aberta e guarda no aparelho. */
export function applyWallpaper(hex: string) {
  const root = document.documentElement;
  if (hex.toLowerCase() === DEFAULT_WALLPAPER) root.style.removeProperty("--wall");
  else root.style.setProperty("--wall", hex);
  if (isDarkWall(hex)) root.setAttribute("data-wall", "escuro");
  else root.removeAttribute("data-wall");
  try {
    localStorage.setItem(WALLPAPER_STORAGE_KEY, hex);
  } catch {
    // sem armazenamento: vale só nesta aba
  }
}

/**
 * Roda no <head>, antes de pintar a tela: aplica o tema guardado no aparelho
 * (sem piscar) e marca o motor do navegador (a refração só existe no Chrome/Edge).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var t=null,f=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}");f=localStorage.getItem("${WALLPAPER_STORAGE_KEY}")}catch(e){}var q=new URLSearchParams(location.search).get("tema");if(q)t=q;if(t&&t!=="padrao")d.setAttribute("data-theme",t);if(f&&/^#[0-9a-fA-F]{6}$/.test(f)){d.style.setProperty("--wall",f);if(${WALL_DARK_TEST})d.setAttribute("data-wall","escuro")}if(/Chrome\\//.test(navigator.userAgent))d.setAttribute("data-engine","chromium")}catch(e){}})();`;

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
