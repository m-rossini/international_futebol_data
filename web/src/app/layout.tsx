import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageViewTracker } from "@/components/shared/PageViewTracker";
import { WebVitalsTracker } from "@/components/shared/WebVitalsTracker";

export const metadata: Metadata = {
  title: "International Football Stats",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gray-50">
        <PageViewTracker />
        <WebVitalsTracker />
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </body>
    </html>
  );
}
