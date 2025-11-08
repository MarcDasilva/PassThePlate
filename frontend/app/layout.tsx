import type React from "react";
import "./global.css";
import { AuthProvider } from "./providers/AuthProvider";

export const metadata = {
  title: "Pass The Plate",
  description: "Save. Share. Smile. Pass the Plate",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
