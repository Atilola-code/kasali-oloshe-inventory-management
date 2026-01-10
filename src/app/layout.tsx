'use client';
import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import ToastProvider from "./providers/ToastProvider";
import { useEffect } from "react";
import { setupMidnightChecker } from "@/app/utils/dateUtils";
import { CacheProvider } from './providers/CacheProvider';

const inter = Inter({ subsets: ["latin"] });


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Initialize the midnight checker
    setupMidnightChecker();
  }, []);
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <AuthProvider>
          <CacheProvider>
          <ToastProvider />
          {children}
          </CacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
