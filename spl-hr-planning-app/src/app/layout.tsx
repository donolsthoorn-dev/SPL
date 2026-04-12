import type { Metadata } from "next";
import "./globals.css";
/* Centraal laden: voorkomt dat route-CSS soms niet wordt meegenomen (dev/monorepo). */
import "./login/login.css";
import "./planning/planning.css";

export const metadata: Metadata = {
  title: "SPL HR Planning",
  description: "Wekelijkse planning maken en delen met medewerkers",
  icons: {
    icon: "https://splopvang.nl/favicon.ico",
    shortcut: "https://splopvang.nl/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
