import type { Metadata } from "next";
import { Comic_Neue, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const comic = Comic_Neue({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-comic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "🎨 My Creative Canvas",
  description:
    "A playful drawing pad for kids with colors, doodles, and creativity galore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${comic.variable}`}>
        {children}
      </body>
    </html>
  );
}
