import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rokade – åpen turneringsservice for norsk sjakk",
  description:
    "Fri og åpen programvare for turneringsadministrasjon: rundeoppsett, resultater og ELO-rapportering.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
