import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rise In CRM - Gestão de Leads e WhatsApp",
  description:
    "CRM inteligente com integração WhatsApp, Kanban de vendas e automações. Gerencie seus leads de forma eficiente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
