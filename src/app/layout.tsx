import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fakers Scout — 사회인야구 전력분석",
  description: "Fakers 야구팀 전력분석 시스템 — 상대팀 분석, 라인업 추천, 승무패 예측",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-gray-900">{children}</body>
    </html>
  );
}
