import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import TrackingProvider from "@/components/TrackingProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "International Football Stats",
  description: "Explore international football match statistics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen`}>
        <TrackingProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <div className="flex-1 p-8 overflow-y-auto">{children}</div>
          </main>
        </TrackingProvider>
      </body>
    </html>
  );
}
