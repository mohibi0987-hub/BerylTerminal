import type { Appearance } from "@clerk/types";

// Restyles Clerk's own hosted UI (UserButton popover + the account/settings
// modal it opens) to match BerylTerminal's dark theme instead of Clerk's
// default light look. Colors mirror the tokens in globals.css directly
// (hex, not var(...)) since this object is handed to Clerk's own styling
// engine rather than rendered through our stylesheet.
export const clerkAppearance: Appearance = {
  variables: {
    colorBackground: "#10151F", // --panel
    colorInputBackground: "#151B27", // --panel2
    colorInputText: "#E8ECF2", // --text
    colorText: "#E8ECF2", // --text
    colorTextSecondary: "#8A94A6", // --muted
    colorPrimary: "#2DD4A7", // --green
    colorDanger: "#FF5C7A", // --red
    colorNeutral: "#E8ECF2",
    borderRadius: "10px",
    fontFamily: "'Inter', sans-serif",
  },
  elements: {
    userButtonPopoverCard: {
      backgroundColor: "#10151F",
      border: "1px solid #1E2733",
      boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)",
    },
    userButtonPopoverActionButton: { color: "#E8ECF2" },
    userButtonPopoverActionButtonText: { color: "#E8ECF2" },
    userButtonPopoverActionButtonIcon: { color: "#8A94A6" },
    userButtonPopoverFooter: { display: "none" },
    userButtonAvatarBox: { width: 32, height: 32 },
    modalBackdrop: { backgroundColor: "rgba(4,6,10,.75)" },
    modalContent: { backgroundColor: "#0A0E17" },
    card: { backgroundColor: "#10151F", border: "1px solid #1E2733" },
    navbar: { backgroundColor: "#0D1220", borderRight: "1px solid #1E2733" },
    navbarButton: { color: "#8A94A6" },
    headerTitle: { color: "#E8ECF2" },
    headerSubtitle: { color: "#8A94A6" },
    formButtonPrimary: { backgroundColor: "#2DD4A7", color: "#04150F" },
    profileSectionPrimaryButton: { color: "#2DD4A7" },
    badge: { backgroundColor: "rgba(45,212,167,.12)", color: "#2DD4A7" },
  },
};
