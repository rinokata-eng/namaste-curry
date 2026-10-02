'use client'

import Link from 'next/link'

export default function BalumaRankPage() {
  const ranks = [
    { 
      name: '見習い', 
      desc: 'すべてのスパイスの旅はここから始まります。レシピの閲覧や保存など、基本機能が利用可能です。', 
      badge: '🌱',
      bg: 'bg-amber-50 border-amber-200 text-amber-900'
    },
    { 
      name: '一人前', 
      desc: '自分なりのカレーレシピを投稿し始め、スパイスコミュニティへの第一歩を踏み出したバルマ。', 
      badge: '🍛',
      bg: 'bg-amber-100 border-amber-300 text-amber-950'
    },
    { 
      name: 'ベテラン', 
      desc: '数々の絶品スパイスカレーを生み出し、多くの仲間から「いいね」を集めている実力派。', 
      badge: '✨',
      bg: 'bg-orange-100 border-orange-300 text-orange-950'
    },
    { 
      name: '達人', 
      desc: 'もはやスパイスの魔術師。その卓越したレシピは多くのフォロワーの心を掴んで離しません。', 
      badge: '🔥',
      bg: 'bg-orange-200 border-orange-400 text-orange-950'
    },
    { 
      name: 'マハラジャ', 
      desc: 'NAMASTEの世界における最高峰。運営事務局からの認定によって授与される伝説の最高ランク。', 
      badge: '👑',
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-sm',
      isSpecial: true
    },
  ]

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 space-y-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <header className="flex justify-between items-center bg-white/80 backdrop-blur p-4 md:p-6 rounded-3xl border border-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👳‍♂️</span>
            <div>
              <h1 className="text-xl font-black text-amber-900 tracking-wide">バルマとは？</h1>
              <p className="text-xs text-amber-700 font-medium">NAMASTEが集うスパイス仲間とランク制度について</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-amber-800 hover:text-amber-900 px-4 py-2 border border-amber-300 rounded-xl bg-amber-50/50 transition active:scale-95"
          >
            ← トップへ戻る
          </Link>
        </header>

        {/* 1. バルマについての説明 */}
        <section className="bg-white p-6 md:p-8 rounded-3xl border border-amber-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-black text-lg">
            <span>🍛</span>
            <h2>「バルマ」とは？</h2>
          </div>
          <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
            NAMASTEにおける<strong>「バルマ」</strong>とは、スパイスカレーを愛し、自慢の秘伝レシピや隠し味を共有しあう<strong>会員（ユーザー）</strong>のことです。<br />
            会員登録をすることで、オリジナルのレシピ投稿や「いいね」、お気に入り保存など、NAMASTEのすべての機能が利用できるようになります。
          </p>
        </section>

        {/* 2. ランク制度についての説明 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-base font-bold text-amber-900 flex items-center gap-2">
              <span>✨</span> バルマランク制度
            </h2>
          </div>

          <div className="space-y-4">
            {ranks.map((r, index) => (
              <div key={r.name} className="bg-white p-5 md:p-6 rounded-3xl border border-amber-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{r.badge}</span>
                    <span className="text-[10px] font-black text-amber-600 tracking-wider">STAGE 0{index + 1}</span>
                    <h3 className="text-lg font-black text-slate-900">{r.name}</h3>
                    <span className={`text-[10px] font-extrabold px-3 py-0.5 rounded-full border ${r.bg}`}>
                      {r.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{r.desc}</p>
                </div>

                {r.isSpecial && (
                  <div className="bg-amber-100/80 border border-amber-300 px-3.5 py-1.5 rounded-2xl text-[11px] text-amber-900 font-bold self-start md:self-center shrink-0">
                    👑 運営認定限定ランク
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 自動ランクアップ・運営に関する注記 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-3xl shadow-sm text-xs space-y-1.5">
          <div className="font-black text-sm flex items-center gap-1.5">
            <span>💡</span> ランクの更新・付与について
          </div>
          <p className="opacity-95 leading-relaxed">
            「見習い」から「達人」までは、日頃のレシピ投稿や「いいね」の獲得状況に応じて自動的にランクアップします。<br />
            最高峰の「マハラジャ」ランクは自動昇格の対象外となり、運営事務局による直接の認定・管理コンソールからの付与のみで行われます。
          </p>
        </div>

      </div>
    </main>
  )
}
