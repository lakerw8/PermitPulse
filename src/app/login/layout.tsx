import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to PermitPulse to save leads, manage your account, and unlock GC contact details on commercial building permits.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign In | PermitPulse",
    description:
      "Sign in to PermitPulse to save leads, manage your account, and unlock GC contact details on commercial building permits.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
