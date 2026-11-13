import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIELDIQ | Operations Intelligence",
  description: "Independent heavy-equipment operations BI engineering demonstration"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
