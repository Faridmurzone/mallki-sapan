import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Mallki Sapan - Huerta Inteligente",
  description: "Sistema inteligente de autogestión para huerta hortícola",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased font-sans">
        <Sidebar />
        <div className="ml-64 min-h-screen bg-gray-50">
          <Header />
          <main className="p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
