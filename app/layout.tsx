import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptiCheck — Prescription Validator",
  description: "Validate SPH, CYL, and Axis inputs with configurable optical prescription rules."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
