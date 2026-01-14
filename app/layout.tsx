import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";

// Fonts are loaded via CSS (public/fonts/font-face.css) to avoid network timeout issues
// with next/font/google. The Aspekta font family is already defined in globals.css

export const metadata: Metadata = {
  title: "Botpress Poster Generator",
  description: "Internal poster generation tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}

