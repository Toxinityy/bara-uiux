import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "data:," },
  title: "BARA — Community Reporting & Incident Intelligence",
  description:
    "Explore BARA's approach to guided smoke and possible-fire reporting, evidence review, and visible uncertainty.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
