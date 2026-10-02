'use client'

import Link from 'next/link'

export default function BalumaRankPage() {
  const ranks = [
    { 
      name: '見習い', 
      desc: 'すべてのスパイスの旅はここから始まります。基本機能の利用やレシピの閲覧・保存が可能です。', 
      condition: '初期ランク（登録時）',
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      badge: '🌱'
    },
    { 
      name: '一人前', 
      desc: '自分なりのカレーレシピを投稿し始め、コミュニティへの第一歩を踏み出したバルマ。', 
      condition: 'レシピ投稿数 1件以上',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      badge: '🍛'
    },
    { 
      name: 'ベテラン', 
      desc: '数々の絶品スパイスカレーを生み出し、多くの仲間から愛されている実力派。', 
      condition: 'レシピ投稿数 3件以上 ＆ 累計イイネ 5件以上',
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      badge: '✨'
    },
    { 
      name: '達人', 
      desc: 'もはやスパイスの魔術師。その卓越したレシピは多くのフォロワーの心を掴んで離しません。', 
      condition: 'レシピ投稿数 5件以上 ＆ 累計イイネ 15件以上',
      color: 'bg-purple-50 text-purple-800 border-purple-200',
      badge: '🔥'
    },
    { 
      name: 'マハラジャ', 
      desc: 'NAMASTEの世界における最高峰。伝説のスパイスマスターとして称賛される最高ランク。', 
      condition: 'レシピ投稿数 10件以上 ＆ 累計イイネ 30件以上',
      color: 'bg-amber-500 text-white border-amber-400 font-extrabold shadow-lg shadow-amber-500/20',
      badge: '👑'
    },
  ]

  return (
    <div className="min-h-screen bg-amber-50/40 text-slate-800 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-amber-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">RANK SYSTEM</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">✨ バルマランク制度について</h1>
            </div>
            <p className="text-sm text-slate-600 mt-2">あなたのスパイス活動（レシピ投稿やイイネ獲得数）に応じて成長する5段階のランクシステムです。</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-2xl hover:bg-slate-200 transition text-sm whitespace-nowrap"
          >
            トップへ戻る
          </Link>
        </div>

        {/* ランク一覧カード */}
        <div className="space-y-4">
          {ranks.map((r, index) => (
            <div key={r.name} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-amber-100/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{r.badge}</span>
                  <span className="text-xs font-mono text-slate-400">STAGE 0{index + 1}</span>
                  <h2 className="text-xl font-bold text-slate-900">{r.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${r.color}`}>
                    {r.name}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{r.desc}</p>
              </div>
              <div className="bg-amber-50/60 px-4 py-3 rounded-2xl border border-amber-200/60 text-xs text-amber-900 whitespace-nowrap font-medium">
                🎯 昇格条件: <span className="font-bold">{r.condition}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 自動反映についての解説 */}
        <div className="bg-amber-500 text-slate-950 p-6 md:p-8 rounded-3xl shadow-md space-y-2">
          <h3 className="font-extrabold flex items-center gap-2 text-lg">
            <span>💡</span> ランクの自動反映システム
          </h3>
          <p className="text-sm text-slate-900 leading-relaxed font-medium">
            レシピを投稿したり、他のユーザーから「いいね」を獲得すると、システムが自動的にあなたの活動量を集計し、条件を達成した瞬間に次のランクへ自動昇格します！ぜひたくさんのカレーをシェアしてください。
          </p>
        </div>
      </div>
    </div>
  )
}
