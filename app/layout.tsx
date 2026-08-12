import type { Metadata } from "next";
import { DM_Sans, Instrument_Sans, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// UI - modern minimal grotesque
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
});

// Reading surface
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-book",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Essays",
  description: "A quiet, book-like place to write.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        dmSans.variable,
        instrumentSans.variable,
        geist.variable,
        "font-sans",
      )}
    >
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
