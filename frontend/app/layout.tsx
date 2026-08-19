import type { Metadata } from "next";
import { Kantumruy_Pro, Bokor, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { QueryProvider } from "./provider";

const kantumruy = Kantumruy_Pro({
  subsets: ["latin", "khmer"],
  variable: "--font-kantumruy",
  display: "swap",
});

const bokor = Bokor({
  weight: "400",
  subsets: ["khmer"],
  variable: "--font-bokor",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HR Management System",
  description: "Build by Kimlong",
  icons: {
    icon: "/bayon.png",
    shortcut: "/bayon.png",
    apple: "/bayon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      className={`${kantumruy.variable} ${bokor.variable} ${inter.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col font-sans"
        style={{ fontFamily: "var(--font-kantumruy), 'Kantumruy Pro', sans-serif" }}
        suppressHydrationWarning
      >
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
