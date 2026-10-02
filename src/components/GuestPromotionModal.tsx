'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function GuestPromotionModal() {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // ログイン済みユーザーには表示しない
    const storedUser = localStorage.getItem('namaste_user')
    if (storedUser) return

    // 閲覧カウントのインクリメント
    const rawCount = localStorage.getItem('namaste_guest_page_views') || '0'
    const newCount = parseInt(rawCount, 10) + 1
    localStorage.setItem('namaste_guest_page_views', newCount.toString())

    // 3回閲覧ごとに表示（例: 3回目, 6回目, 9回目...）
    if (newCount > 0 && newCount % 3 === 0) {
      setShowModal(true)
    }
  }, [])

  const handleClose = () => {
    setShowModal(false)
  }

  if (!showModal) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-2 border-amber-300 space-y-6 text-center animate-in fade-in zoom-in duration-200">
        <div className="text-5xl">👳‍♂️✨</div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-amber-900">
            NAMASTEへようこそ！<br />バルマ登録でもっと楽しもう
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            レシピをご閲覧いただきありがとうございます！<br />無料のバルマ（会員）登録をすると、すべての機能が解放されます。
          </p>
        </div>

        {/* 訴求ポイント */}
        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 text-left space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">🍛</span>
            <div>
              <div className="font-bold text-xs text-amber-900">自慢のカレーレシピを投稿</div>
              <div className="text-[11px] text-slate-600">自分だけのこだわりレシピを全国のバルマへ共有できます！</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">⭐</span>
            <div>
              <div className="font-bold text-xs text-amber-900">便利なお気に入り・いいね機能</div>
              <div className="text-[11px] text-slate-600">気になったレシピを保存して、いつでも見返すことができます！</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">👑</span>
            <div>
              <div className="font-bold text-xs text-amber-900">バルマランクシステム</div>
              <div className="text-[11px] text-slate-600">レシピ投稿や高評価獲得で「見習い」から最高位「マハラジャ」へ昇格！</div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <Link
            href="/users/new"
            className="block w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-2xl shadow-md transition text-sm active:scale-95"
          >
            今すぐ無料でバルマ登録する 🚀
          </Link>

          <button
            onClick={handleClose}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
          >
            まずはそのまま閲覧を続ける
          </button>
        </div>
      </div>
    </div>
  )
}
