import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "BerylTerminal — Multi-broker trading terminal",
  description: "One terminal for every broker and every market. Paper and live trading, real-time charts, risk controls, and a full audit log.",
};

// Only set when acting as a Clerk satellite domain (see middleware.ts for
// the full explanation). Typed loosely here since ClerkProvider's props
// don't have a clean "optionally satellite" shape to spread onto.
const satelliteProps: Record<string, unknown> =
  process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE === "true"
    ? {
        isSatellite: true,
        domain: process.env.NEXT_PUBLIC_CLERK_DOMAIN,
        signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      }
    : {};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider {...(satelliteProps as object)}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
