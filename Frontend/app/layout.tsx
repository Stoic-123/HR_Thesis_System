import type { Metadata } from "next";
import { Kantumruy_Pro, Bokor, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { QueryProvider } from "./provider";

const kantumruy = Kantumruy_Pro({
  subsets: ["latin"],
  variable: "--font-kantumruy",
});

const bokor = Bokor({
  weight: "400",
  subsets: ["khmer"],
  variable: "--font-bokor",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HR Management System",
  description: "Build by Kimlong ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      className={` ${kantumruy.variable} ${bokor.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
