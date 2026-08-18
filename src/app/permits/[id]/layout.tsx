import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Permit Details",
  description:
    "View commercial building permit details including project description, estimated value, filing date, and general contractor contact information.",
  openGraph: {
    title: "Permit Details | PermitPulse",
    description:
      "View commercial building permit details including project description, estimated value, filing date, and general contractor contact information.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Permit Details | PermitPulse",
    description:
      "View commercial building permit details including project description, estimated value, and GC contact information.",
  },
};

export default function PermitDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
