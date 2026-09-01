import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <SignUp appearance={{ variables: { colorPrimary: "#2DD4A7", colorBackground: "#10151F", colorText: "#E8ECF2" } }} />
    </div>
  );
}
