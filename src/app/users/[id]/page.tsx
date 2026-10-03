'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type StatType = 'all' | 'posted' | 'liked' | 'bookmarked'

// ゲージが「グーン」と滑らかに伸縮・変化するアニメーションコンポーネント
function AnimatedBar({ label, value, minLabel, maxLabel }: { label: string; value: number; minLabel: string; maxLabel: string }) {
  const percentage = Math.min(100, Math.max(0, ((value - 1) / 4) * 100))

  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between items-center font-bold text-slate-700">
        <span>{label}</span>
        <span className="text-amber-600 font-black text-sm">
          {value} <span className="text-[10px] text-slate-400 font-normal">/ 5</span>
        </span>
      </div>
      <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden border border-slate-300/60 p-0.5">
        <div
          className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full shadow-sm"
          style={{
            width: `${percentage}%`,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [recipes, setRecipes] = useState<any[]>([])
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'posted' | 'bookmarked'>('posted')
  const [loading, setLoading] = useState(true)

  // プロフィール編集モーダル状態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // 4軸傾向データ状態
  const [stats, setStats] = useState<Record<StatType, { count: number; avgTaste: number; avgEffort: number; avgSpiciness: number }>>({
    all: { count: 0, avgTaste: 3, avgEffort: 3, avgSpiciness: 3 },
    posted: { count: 0, avgTaste: 3, avgEffort: 3, avgSpiciness: 3 },
    liked: { count: 0, avgTaste: 3, avgEffort: 3, avgSpiciness: 3 },
    bookmarked: { count: 0, avgTaste: 3, avgEffort: 3, avgSpiciness: 3 },
  })

  // 自動切り替え管理
  const [selectedStatMode, setSelectedStatMode] = useState<StatType>('all')
  const [isAutoPlay, setIsAutoPlay] = useState(true)

  useEffect(() => {
    if (userId) {
      loadUserData()
    }
  }, [userId])

  // 数秒ごとの自動切替ループ処理（3.5秒周期）
  useEffect(() => {
    if (!isAutoPlay) return
    const modes: StatType[] = ['all', 'posted', 'liked', 'bookmarked']
    const interval = setInterval(() => {
      setSelectedStatMode((prev) => {
        const nextIdx = (modes.indexOf(prev) + 1) % modes.length
        return modes[nextIdx]
      })
    }, 3500)

    return () => clearInterval(interval)
  }, [isAutoPlay])

  async function loadUserData() {
    setLoading(true)

    // 0. 現在のログインユーザーID取得
    const { data: authData } = await supabase.auth.getUser()
    const loginUser = authData.user
    if (loginUser) {
      setCurrentUserId(loginUser.id)
    }

    // 1. プロフィール＆投稿データ取得
    const [{ data: pData }, { data: rData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('recipes').select('*').eq('profile_id', userId).order('created_at', { ascending: false }),
    ])

    const userRecipes = rData || []
    setRecipes(userRecipes)

    if (pData) {
      setEditUsername(pData.username || '')
      setEditBio(pData.bio || '')
    }

    // 2. いいね＆お気に入りデータ取得
    const [{ data: lData }, { data: bData }] = await Promise.all([
      supabase.from('recipe_likes').select('recipe_id').eq('user_id', userId),
      supabase.from('recipe_bookmarks').select('recipe_id, recipes(*)').eq('user_id', userId),
    ])

    const likedIds = (lData || []).map((item) => item.recipe_id)
    const bmList = (bData || []).map((item) => item.recipes).filter(Boolean)
    const bookmarkedIds = bmList.map((r: any) => r.id)
    setBookmarks(bmList)

    // 3. ランクの正確な判定（DBに設定があればそれを最優先、なければ実績自動判定）
    let rank = pData?.balma_rank
    if (!rank) {
      const postCount = userRecipes.length
      const totalLikes = userRecipes.reduce((sum, r) => sum + (r.likes_count || 0), 0)
      if (postCount >= 10 || totalLikes >= 50 || pData?.role?.includes('admin')) {
        rank = 'マハラジャ'
      } else if (postCount >= 3) {
        rank = 'シェフ'
      } else {
        rank = '見習い'
      }
    }

    setProfile({
      ...pData,
      balma_rank: rank,
    })

    // 4. 評価アンケートの多角集計
    const postedIds = userRecipes.map((r) => r.id)
    const allRelevantIds = Array.from(new Set([...postedIds, ...likedIds, ...bookmarkedIds]))

    if (allRelevantIds.length > 0) {
      const { data: eData } = await supabase.from('recipe_evaluations').select('*').in('recipe_id', allRelevantIds)
      const evals = eData || []

      const calcStatsForIds = (targetIds: string[]) => {
        const matchedEvals = evals.filter((e) => targetIds.includes(e.recipe_id))
        if (matchedEvals.length === 0) return { count: 0, avgTaste: 3, avgEffort: 3, avgSpiciness: 3 }

        const len = matchedEvals.length
        return {
          count: len,
          avgTaste: Math.round((matchedEvals.reduce((s, e) => s + (e.score_taste || 3), 0) / len) * 10) / 10,
          avgEffort: Math.round((matchedEvals.reduce((s, e) => s + (e.score_effort || 3), 0) / len) * 10) / 10,
          avgSpiciness: Math.round((matchedEvals.reduce((s, e) => s + (e.score_spiciness || 3), 0) / len) * 10) / 10,
        }
      }

      setStats({
        all: calcStatsForIds(allRelevantIds),
        posted: calcStatsForIds(postedIds),
        liked: calcStatsForIds(likedIds),
        bookmarked: calcStatsForIds(bookmarkedIds),
      })
    }

    setLoading(false)
  }

  // プロフィール更新処理
  const handleSaveProfile = async () => {
    if (!currentUserId) return
    setIsUpdating(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        username: editUsername,
        bio: editBio,
      })
      .eq('id', currentUserId)

    setIsUpdating(false)

    if (error) {
      alert('プロフィールの更新に失敗しました: ' + error.message)
    } else {
      setProfile((prev: any) => ({
        ...prev,
        username: editUsername,
        bio: editBio,
      }))
      setIsEditModalOpen(false)
      alert('プロフィールを更新しました！')
    }
  }

  const currentStat = stats[selectedStatMode]

  const modeLabels: Record<StatType, { name: string; icon: string }> = {
    all: { name: '総合傾向', icon: '✨' },
    posted: { name: '投稿したレシピ', icon: '🍛' },
    liked: { name: 'いいねしたレシピ', icon: '❤️' },
    bookmarked: { name: '保存したレシピ', icon: '⭐' },
  }

  // 本人確認フラグ（未ログイン時でも管理者ID等とマッチすれば表示）
  const isSelf = currentUserId === userId || (!currentUserId && userId === '009df531-3378-4b10-9ce7-94a758788e94')

  if (loading) {
    return (
      <main className="min-h-screen bg-amber-50 p-6 flex justify-center items-center text-slate-600 font-bold">
        バルマ情報を読み込み中... 👳‍♂️
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-amber-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* 戻るリンク */}
        <button
          onClick={() => router.back()}
          className="text-amber-700 hover:text-amber-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
        >
          ← レシピ一覧に戻る
        </button>

        {/* バルマ基本情報ヘッダー */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl border-2 border-amber-200 shadow-inner">
                👳‍♂️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-800">{profile?.username || 'たかのり'}</h1>
                  <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-bold border border-amber-200">
                    {profile?.balma_rank || 'マハラジャ'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {profile?.bio || '自己紹介文はまだ設定されていません。'}
                </p>
              </div>
            </div>

            {/* 本人の場合に「プロフィール編集」ボタンを表示 */}
            {isSelf && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-4 py-2 rounded-xl transition font-bold shadow-sm flex items-center gap-1.5 cursor-pointer self-end sm:self-center"
              >
                ✏️ プロフィール編集
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* アカウント活動状況 */}
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>⏱</span> アカウント活動状況
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

            {/* 🍛 多角的アニメーション傾向カード */}
            <div
              className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 space-y-3 relative overflow-hidden"
              onMouseEnter={() => setIsAutoPlay(false)}
              onMouseLeave={() => setIsAutoPlay(true)}
            >
              {/* モード切り替えヘッダー */}
              <div className="flex justify-between items-center border-b border-amber-200/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{modeLabels[selectedStatMode].icon}</span>
                  <h3 className="text-xs font-black text-amber-950">
                    {modeLabels[selectedStatMode].name}
                  </h3>
                </div>
                <div className="flex gap-1.5">
                  {(['all', 'posted', 'liked', 'bookmarked'] as StatType[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedStatMode(m)
                        setIsAutoPlay(false)
                      }}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        selectedStatMode === m ? 'bg-amber-600 w-5' : 'bg-slate-300 hover:bg-slate-400 w-2'
                      }`}
                      title={modeLabels[m].name}
                    />
                  ))}
                </div>
              </div>

              {/* 伸縮アニメーションゲージ */}
              {currentStat.count === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  まだ評価データが集まっていません。
                </p>
              ) : (
                <div className="space-y-2.5 pt-1">
                  <AnimatedBar
                    label="本格度・味わい"
                    value={currentStat.avgTaste}
                    minLabel="家庭的"
                    maxLabel="本格的"
                  />
                  <AnimatedBar
                    label="調理の手間"
                    value={currentStat.avgEffort}
                    minLabel="時短・手軽"
                    maxLabel="本格仕込み"
                  />
                  <AnimatedBar
                    label="辛さレベル"
                    value={currentStat.avgSpiciness}
                    minLabel="マイルド"
                    maxLabel="激辛"
                  />
                  <p className="text-[10px] text-slate-400 text-right font-medium">
                    ({currentStat.count}件のデータに基づく / 自動ループ表示中)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* タブ切り替え（投稿レシピ / お気に入りレシピ） */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('posted')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === 'posted'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            🍛 投稿したレシピ ({recipes.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarked')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
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
              className="bg-white rounded-2xl p-5 border border-amber-100/80 shadow-sm hover:shadow-md transition space-y-2 block"
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

      {/* ✏️ プロフィール編集モーダル */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 border border-amber-100 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <span>✏️</span> プロフィール編集
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">バルマ名 (表示名)</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="例: たかのり"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">自己紹介文</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  placeholder="好きなスパイスやこだわりの調理法など..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-amber-500 transition resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs transition cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isUpdating}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
