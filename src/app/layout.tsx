import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ernit Partner Dashboard",
  description: "Partner access for experience verification and coupon lookup",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-purple-700 to-blue-500 text-white">
        {children}
      </body>
    </html>
  );
}
