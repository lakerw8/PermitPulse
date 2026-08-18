import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Manage your saved permit leads, track lead status, and configure your PermitPulse account settings.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Dashboard | PermitPulse",
    description:
      "Manage your saved permit leads, track lead status, and configure your PermitPulse account settings.",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
