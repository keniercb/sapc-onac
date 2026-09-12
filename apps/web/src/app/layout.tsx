import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/lib/query/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAPC-ONAC — Sistema de Atención a Pensionados",
  description: "Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC), Cuba.",
  keywords: ["ONAC", "pensionados", "Cuba", "combatientes", "gestión"],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CU" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <SonnerToaster
              position="top-right"
              richColors
              closeButton
              theme="light"
              duration={5000}
              expand={false}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
