'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [profile, setProfile] = useState<any>(null)
  const [recipes, setRecipes] = useState<any[]>([])
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'posted' | 'bookmarked'>('posted')
  const [loading, setLoading] = useState(true)

  // バルマの投稿レシピに対するアンケート集計結果
  const [userTasteStats, setUserTasteStats] = useState<{
    count: number
    avgTaste: number
    avgEffort: number
    avgIngredients: number
    avgSpiciness: number
    avgStyle: number
  }>({
    count: 0,
    avgTaste: 3,
    avgEffort: 3,
    avgIngredients: 3,
    avgSpiciness: 3,
    avgStyle: 3,
  })

  useEffect(() => {
    if (userId) {
      loadUserData()
    }
  }, [userId])

  async function loadUserData() {
    setLoading(true)

    // 1. プロフィールデータ取得
    const { data: pData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(pData)

    // 2. 投稿レシピ取得
    const { data: rData } = await supabase
      .from('recipes')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })

    const userRecipes = rData || []
    setRecipes(userRecipes)

    // 3. 投稿レシピに対するアンケート評価データを自動集計
    if (userRecipes.length > 0) {
      const recipeIds = userRecipes.map((r) => r.id)
      const { data: eData } = await supabase
        .from('recipe_evaluations')
        .select('*')
        .in('recipe_id', recipeIds)

      if (eData && eData.length > 0) {
        const total = eData.length
        const calcAvg = (key: string) =>
          Math.round((eData.reduce((sum, item) => sum + (item[key] || 3), 0) / total) * 10) / 10

        setUserTasteStats({
          count: total,
          avgTaste: calcAvg('score_taste'),
          avgEffort: calcAvg('score_effort'),
          avgIngredients: calcAvg('score_ingredients'),
          avgSpiciness: calcAvg('score_spiciness'),
          avgStyle: calcAvg('score_style'),
        })
      }
    }

    // 4. お気に入りレシピ取得
    const { data: bData } = await supabase
      .from('recipe_bookmarks')
      .select('recipe_id, recipes(*)')
      .eq('profile_id', userId)

    if (bData) {
      setBookmarks(bData.map((b) => b.recipes).filter(Boolean))
    }

    setLoading(false)
  }

  // スコアのバー表示用コンポーネント
  const ScoreBar = ({ label, value, minLabel, maxLabel }: { label: string; value: number; minLabel: string; maxLabel: string }) => (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between items-center font-bold text-slate-700">
        <span>{label}</span>
        <span className="text-amber-600 font-black">{value} <span className="text-[10px] text-slate-400 font-normal">/ 5</span></span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
        <div
          className="bg-amber-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-amber-50/50 p-6 flex justify-center items-center text-slate-600 font-bold">
        バルマ情報を読み込み中... 👳‍♂️
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-amber-50/50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* 戻るリンク */}
        <button
          onClick={() => router.back()}
          className="text-amber-700 hover:text-amber-800 text-xs font-bold flex items-center gap-1 transition"
        >
          ← レシピ一覧に戻る
        </button>

        {/* バルマ基本情報ヘッダー */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100/80 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl border-2 border-amber-200 shadow-inner">
              👳‍♂️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-800">{profile?.username || 'たかのり'}</h1>
                <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-bold border border-amber-200">
                  {profile?.balma_rank || '見習い'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {profile?.bio || '自己紹介文はまだ設定されていません。'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* アカウント活動状況 */}
            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>⏱️</span> アカウント活動状況
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">投稿レシピ数:</span>
                  <p className="font-bold text-slate-800 text-sm">{recipes.length} 件</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">最終ログイン:</span>
                  <p className="font-bold text-slate-800 text-sm">
                    {profile?.last_login_at
                      ? new Date(profile.last_login_at).toLocaleDateString('ja-JP')
                      : '2026/10/3'}
                  </p>
                </div>
              </div>
            </div>

            {/* 投稿レシピの平均傾向（アンケート自動集計） */}
            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>🍛</span> このバルマのカレーの傾向
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">
                  ({userTasteStats.count}件のレシピ評価に基づく)
                </span>
              </div>

              {userTasteStats.count === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  まだ投稿レシピへの評価が集まっていません。
                </p>
              ) : (
                <div className="space-y-2.5">
                  <ScoreBar
                    label="本格度・味わい"
                    value={userTasteStats.avgTaste}
                    minLabel="家庭的"
                    maxLabel="本格的"
                  />
                  <ScoreBar
                    label="調理の手間"
                    value={userTasteStats.avgEffort}
                    minLabel="時短・手軽"
                    maxLabel="本格仕込み"
                  />
                  <ScoreBar
                    label="辛さレベル"
                    value={userTasteStats.avgSpiciness}
                    minLabel="マイルド"
                    maxLabel="激辛"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* タブ切り替え（投稿レシピ / お気に入りレシピ） */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('posted')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition ${
              activeTab === 'posted'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            🍛 投稿したレシピ ({recipes.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarked')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition ${
              activeTab === 'bookmarked'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ⭐ お気に入りレシピ ({bookmarks.length})
          </button>
        </div>

        {/* レシピカード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(activeTab === 'posted' ? recipes : bookmarks).map((r) => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition space-y-2 block"
            >
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {r.genre}
              </span>
              <h3 className="font-bold text-slate-800 text-sm">{r.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>
            </Link>
          ))}
        </div>

      </div>
    </main>
  )
}
