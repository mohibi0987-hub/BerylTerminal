import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = { title: "BerylTerminal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#2DD4A7" } }}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
