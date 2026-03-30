import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Data OS",
  description: "Operational console for upload readiness, pipeline execution, and report delivery."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
