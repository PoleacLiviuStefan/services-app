// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NavbarMobile from "@/components/NavbarMobile";
import Providers from "@/components/Providers"; // Asigură-te că calea este corectă
import GlobalPresenceTracker from "@/components/globalTracker/GlobalPresenceTracker";
import Footer from "@/components/Footer";
import CatalogInitializer from "@/components/CatalogInitializer";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MysticGold",
  description: "MysticGold s-a născut dintr-o nevoie reală și dureroasă: prea mulți\n" +
               "oameni ajung să ceară ajutor în cele mai vulnerabile momente ale\n" +
               "vieții, doar ca să fie dezamăgiți",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
 <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col   overflow-x-hidden
  max-w-full`}
      >
        <Providers>
          <GlobalPresenceTracker />
          <Navbar />
          <NavbarMobile />

          {/* Conținutul principal cu creștere automată */}
          <CatalogInitializer>
            <main className="flex-1 mt-[50px] lg:mt-[60px]">
              {children}
            </main>
          </CatalogInitializer>
        <Footer />
        </Providers>

      </body>
    </html>
  );
}
