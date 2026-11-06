import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "온라인 면접관",
  description: "회사 리서치부터 맞춤 서류, 회사 기준 평가, 모의 면접까지 한 곳에서",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
