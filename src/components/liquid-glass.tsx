"use client";

import { useEffect } from "react";

/**
 * Refração do tema Liquid Glass.
 *
 * Cada superfície de vidro ganha um mapa de deslocamento do tamanho dela
 * (borda arredondada = lente): perto do aro, o fundo é puxado para dentro e
 * levemente separado em cores, como num vidro de verdade. O mapa vai num
 * filtro SVG usado pelo backdrop-filter, que só o Chrome/Edge aceita; nos
 * outros navegadores o tema fica com o vidro desfocado e o brilho do CSS.
 */
const SEL = ".widget";
const SVGNS = "http://www.w3.org/2000/svg";

function lensMap(w: number, h: number, r: number) {
  const k = Math.min(1, 260 / Math.max(w, h));
  const W = Math.max(8, Math.round(w * k));
  const H = Math.max(8, Math.round(h * k));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const R = Math.max(1, Math.min(r, w / 2, h / 2));
  const band = Math.max(6, Math.min(26, Math.min(w, h) * 0.34)); // largura do chanfro
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = (i + 0.5) / k - w / 2;
      const y = (j + 0.5) / k - h / 2;
      const px = Math.abs(x) - (w / 2 - R);
      const py = Math.abs(y) - (h / 2 - R);
      let dist: number, nx: number, ny: number;
      if (px > 0 && py > 0) {
        const L = Math.hypot(px, py) || 1;
        dist = R - L;
        nx = px / L;
        ny = py / L;
      } else if (px > py) {
        dist = R - px;
        nx = 1;
        ny = 0;
      } else {
        dist = R - py;
        nx = 0;
        ny = 1;
      }
      if (x < 0) nx = -nx;
      if (y < 0) ny = -ny;
      let t = 1 - Math.max(0, dist) / band;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const m = t * t * (1.6 - 0.6 * t); // forte no aro, some para dentro
      const o = (j * W + i) * 4;
      d[o] = 128 - nx * m * 127;
      d[o + 1] = 128 - ny * m * 127;
      d[o + 2] = 128;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { url: canvas.toDataURL(), band };
}

export function LiquidGlass() {
  useEffect(() => {
    const root = document.documentElement;
    let supports = false;
    try {
      supports = /Chrome\//.test(navigator.userAgent) && CSS.supports("backdrop-filter", "url(#x) blur(1px)");
    } catch {}
    if (!supports) return;

    let defs: SVGDefsElement | null = null;
    const filters = new Map<string, string>();
    let n = 0;
    const watched = new WeakSet<Element>();
    const on = () => root.getAttribute("data-theme") === "liquid";

    function filterFor(w: number, h: number, r: number) {
      const z = window.devicePixelRatio || 1;
      const key = `${w}x${h}r${r}z${z}`;
      const hit = filters.get(key);
      if (hit) return hit;
      if (!defs) {
        const svg = document.createElementNS(SVGNS, "svg");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("width", "0");
        svg.setAttribute("height", "0");
        svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
        defs = document.createElementNS(SVGNS, "defs");
        svg.appendChild(defs);
        document.body.appendChild(svg);
      }
      if (filters.size > 160) {
        defs.innerHTML = "";
        filters.clear();
      }
      // o Chrome aplica o filtro do backdrop em pixels do aparelho
      const W = Math.round(w * z);
      const H = Math.round(h * z);
      const { url, band } = lensMap(w, h, r);
      const S = Math.round(band * 1.35 * z);
      const id = `bnkr-lg${++n}`;
      defs.insertAdjacentHTML(
        "beforeend",
        `<filter id="${id}" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feImage href="${url}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" result="m"/>
          <feDisplacementMap in="SourceGraphic" in2="m" scale="${S}" xChannelSelector="R" yChannelSelector="G" result="dr"/>
          <feDisplacementMap in="SourceGraphic" in2="m" scale="${Math.round(S * 0.96)}" xChannelSelector="R" yChannelSelector="G" result="dg"/>
          <feDisplacementMap in="SourceGraphic" in2="m" scale="${Math.round(S * 0.92)}" xChannelSelector="R" yChannelSelector="G" result="db"/>
          <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/>
          <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>
          <feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b"/>
          <feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg"/>
          <feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1"/>
        </filter>`,
      );
      filters.set(key, id);
      return id;
    }

    function apply(el: HTMLElement) {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      // superfícies gigantes (listas longas) ficam só com o desfoque, por desempenho
      const nested = !!el.parentElement?.closest(SEL); // card dentro de card: sem refração própria
      if (!on() || nested || w < 24 || h < 24 || w * h > 1800 * 1100) {
        el.style.removeProperty("--lg-ref");
        return;
      }
      const r = Math.round(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0);
      el.style.setProperty("--lg-ref", `url(#${filterFor(w, h, r)})`);
    }

    const ro = new ResizeObserver((entries) => entries.forEach((e) => apply(e.target as HTMLElement)));
    const watch = (el: Element) => {
      if (watched.has(el)) return;
      watched.add(el);
      ro.observe(el);
    };
    const all = () => document.querySelectorAll<HTMLElement>(SEL);
    const reapply = () => all().forEach(apply);

    all().forEach(watch);
    const mo = new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "attributes") {
          reapply(); // trocou o tema
          continue;
        }
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SEL)) watch(node);
          node.querySelectorAll(SEL).forEach(watch);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    // zoom do navegador ou troca de monitor muda a densidade de pixels
    let mq: MediaQueryList | null = null;
    const onZoom = () => {
      reapply();
      listen();
    };
    const listen = () => {
      mq?.removeEventListener("change", onZoom);
      mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onZoom);
    };
    listen();

    return () => {
      ro.disconnect();
      mo.disconnect();
      mq?.removeEventListener("change", onZoom);
    };
  }, []);
  return null;
}
