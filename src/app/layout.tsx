import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { LiquidGlass } from "@/components/liquid-glass";

export const metadata: Metadata = {
  title: "GO Bunker!",
  description: "Sistema de gestão da GO Bunker! Mídia e Tecnologia",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <LiquidGlass />
      </body>
    </html>
  );
}
