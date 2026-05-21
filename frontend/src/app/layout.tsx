import type { Metadata } from "next";
import { Nunito_Sans, Young_Serif } from "next/font/google";
import "./globals.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodLink | Rescue good food, fast",
  description:
    "FoodLink connects surplus food with neighbors, local partners, and volunteers in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${youngSerif.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
