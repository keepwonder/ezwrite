import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EzWrite - 现代 Markdown 写作工作台",
  description: "为内容创作者打造的写作-发布一体化工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
