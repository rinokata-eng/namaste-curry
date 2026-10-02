import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAMASTE - カレー交換のためのプラットフォーム",
  description: "こだわりレシピと秘伝の隠し味をシェアするカレー特化型Webアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen flex flex-col justify-between">
        <div>{children}</div>

        {/* 共通フッター */}
        <footer className="bg-amber-950 text-amber-200/80 text-xs py-8 px-4 mt-12 border-t border-amber-800/50">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div>
              <p className="font-black text-sm text-amber-400">NAMASTE</p>
              <p className="text-[10px] text-amber-300/60 mt-0.5">© 2026 NAMASTE 運営事務局 All Rights Reserved.</p>
            </div>

            <div className="flex flex-wrap gap-4 font-bold text-amber-200">
              <Link href="/terms" className="hover:text-white transition">
                利用規約
              </Link>
              <Link href="/privacy" className="hover:text-white transition">
                プライバシーポリシー
              </Link>
              <Link href="/contact" className="hover:text-white transition">
                お問い合わせ
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
