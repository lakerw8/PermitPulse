import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | PermitPulse",
    default: "PermitPulse - Commercial Permit Leads for Subcontractors",
  },
  description:
    "Turn newly filed commercial building permits into clean, trade-filtered leads with GC contact information. Reach decision-makers weeks before public bid boards open.",
  openGraph: {
    type: "website",
    siteName: "PermitPulse",
    title: "PermitPulse - Commercial Permit Leads for Subcontractors",
    description:
      "Turn newly filed commercial building permits into clean, trade-filtered leads with GC contact information. Reach decision-makers weeks before public bid boards open.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PermitPulse - Commercial Permit Leads for Subcontractors",
    description:
      "Turn newly filed commercial building permits into clean, trade-filtered leads with GC contact information. Reach decision-makers weeks before public bid boards open.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1 pt-14 sm:pt-16">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
