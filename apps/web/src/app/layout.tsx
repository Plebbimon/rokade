import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-sans",
});
const condensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-condensed",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Rokade – åpen turneringsservice for norsk sjakk",
  description:
    "Fri og åpen programvare for turneringsadministrasjon: rundeoppsett, resultater og ELO-rapportering.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" className={`${sans.variable} ${condensed.variable} ${mono.variable}`}>
      <body>
        <header className="site-header">
          <Link href="/" className="brand" title="Rokade – 0-0, trekket der to brikker flytter samtidig">
            <span className="brand-mark">0-0</span>
            <span className="brand-name">Rokade</span>
          </Link>
          <nav>
            <Link href="/terminliste">Terminliste</Link>
            <Link href="/turneringer">For arrangører</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <span>
            Rokade er fri programvare for norsk sjakk (AGPL) ·{" "}
            <a href="https://github.com/Plebbimon/rokade">Kildekoden på GitHub</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
