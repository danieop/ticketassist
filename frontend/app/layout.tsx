import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketAssist",
  description: "Sequential multi-agent bug ticket analysis prototype"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
