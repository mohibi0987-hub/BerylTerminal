import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public: marketing homepage, legal pages, and the sign-in page itself.
// Everything else (the terminal + all /api routes) requires a session.
const isPublicRoute = createRouteMatcher(["/", "/login(.*)", "/privacy", "/terms", "/pricing"]);

// BerylTerminal and TradeBeryl share one Clerk application so a person is
// signed in on both once they've signed in on either. TradeBeryl is the
// primary domain (it owns account/billing settings); BerylTerminal runs
// as a Clerk "satellite" domain — same instance, same session, different
// site. Set NEXT_PUBLIC_CLERK_IS_SATELLITE=true (and the two URLs below)
// only once TradeBeryl's own domain has production Clerk keys configured;
// leave it unset for local dev, where each app just uses its own session.
const isSatellite = process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE === "true";

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) await auth.protect();
  },
  isSatellite
    ? {
        isSatellite: true,
        domain: process.env.NEXT_PUBLIC_CLERK_DOMAIN, // this app's own domain, e.g. berylterminal.vercel.app
        signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL, // full URL to TradeBeryl's sign-in, e.g. https://tradeberyl.com/login
      }
    : undefined,
);

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
