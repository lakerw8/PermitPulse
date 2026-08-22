import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme-store";
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
    "Turn newly filed commercial building permits into clean, trade-filtered leads, with the contractor contact details city records publish. Reach GCs weeks before public bid boards open.",
  openGraph: {
    type: "website",
    siteName: "PermitPulse",
    title: "PermitPulse - Commercial Permit Leads for Subcontractors",
    description:
      "Turn newly filed commercial building permits into clean, trade-filtered leads, with the contractor contact details city records publish. Reach GCs weeks before public bid boards open.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PermitPulse - Commercial Permit Leads for Subcontractors",
    description:
      "Turn newly filed commercial building permits into clean, trade-filtered leads, with the contractor contact details city records publish. Reach GCs weeks before public bid boards open.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme script sets `class` and `color-scheme` on this element before
      // React hydrates, which is a deliberate mismatch rather than a bug.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Applies the stored palette before any Next.js module runs, so a
            dark-mode visitor never sees a flash of the light theme. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <Header />
          <main id="main-content" className="flex-1 pt-14 sm:pt-16">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
