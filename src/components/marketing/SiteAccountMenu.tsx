"use client";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

// This whole composition needs to live in its own "use client" file. Clerk's
// dot-notation sub-components (UserButton.MenuItems, UserButton.Link) are
// each their own client reference, and composing them as JSX children
// inside a Server Component (which SiteNav is) makes Next.js's RSC bundler
// responsible for correctly serializing those references across the
// server/client boundary — that detection is fragile and failed
// intermittently in production (some requests 200, some 500 with a
// "module not found" error pointing at Clerk's client-boundary code).
// Moving the whole thing into a real client component removes the
// boundary-crossing entirely.
export function SiteAccountMenu() {
  return (
    <>
      <SignedIn>
        <a href="/markets" className="btn btn-ghost">Terminal</a>
        <UserButton afterSignOutUrl="/" appearance={clerkAppearance}>
          <UserButton.MenuItems>
            <UserButton.Link label="General Settings" href="/settings" labelIcon={<span>⚙️</span>} />
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>
      <SignedOut>
        <a href="/login" className="btn btn-ghost">Sign in</a>
        <a href="/login" className="btn btn-primary">Launch Terminal</a>
      </SignedOut>
    </>
  );
}
