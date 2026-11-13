import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./motion.css";

export const metadata: Metadata = {
  title: "Casa a Dois — Simulador de Vida em Aveiro",
  description:
    "Simulador do custo de arrendar um T1 em Aveiro e viver em conjunto: rendimentos, despesas, orçamento, divisão justa, poupança e custo de entrada.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
