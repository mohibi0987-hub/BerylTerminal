import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export function SiteNav() {
  return (
    <header className="site-nav">
      <div className="container">
        <a href="/" className="logo">
          <span className="dot" />
          BerylTerminal
        </a>
        <nav>
          <a href="/#brokers">Brokers</a>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
        </nav>
        <div className="spacer">
          <SignedIn>
            <a href="/terminal" className="btn btn-ghost">Terminal</a>
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
        </div>
      </div>
    </header>
  );
}
