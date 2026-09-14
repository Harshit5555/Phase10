import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tenfold — Cards. Company. One more round.",
  description: "Gather your friends for a playful progressive rummy game. Complete ten phases, one good hand at a time.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
