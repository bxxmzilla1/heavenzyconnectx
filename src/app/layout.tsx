import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connect Pages",
  description: "Shareable pages that connect Instagram accounts to bundle.social.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
