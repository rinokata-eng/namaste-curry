'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type StatType = 'all' | 'liked' | 'bookmarked'

// ゲージ（バー）を完全に無くし、ライン上のアイコン位置のみで傾向を示すコンポーネント
function AnimatedIconBar({ label, value, minLabel, maxLabel }: { label: string; value: number; minLabel: string; maxLabel: string }) {
  const percentage = Math.min(100, Math.max(0, ((value - 1) / 4) * 100))

  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between items-center font-bold text-slate-700 text-[11px]">
        <span>{minLabel}</span>
        <span className="text-amber-900 font-bold">{label} ({value})</span>
        <span>{maxLabel}</span>
      </div>
      <div className="w-full h-4 relative overflow-visible flex items-center my-1">
        <div className="w-full h-1 bg-slate-200 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg transition-all duration-500 select-none pointer-events-none drop-shadow z-10"
          style={{ left: `${percentage}%` }}
        >
          🍛
        </div>
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
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editPassword, setEditPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // フォロー・フォロワー状態
  const [followingList, setFollowingList] = useState<any[]>([])
  const [followerList, setFollowerList] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false)
  const [followModalType, setFollowModalType] = useState<'following' | 'followers'>('following')
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)

  // 4軸傾向データ状態
  const [stats, setStats] = useState<Record<StatType, { count: number; avgTaste: number; avgEffort: number; avgSpiciness: number }>>({
    all: { count: 0, avgTaste: 3, avgEffort: 3, avgSpiciness: 3 },
    liked: { count: 0, avgTaste: 3, avgEffort: 3, avgSpiciness: 3 },
    bookmarked: { count: 0, avgTaste: 3, avgEffort: 3, avgSpiciness: 3 },
  })

  // 手動切り替え管理
  const [selectedStatMode, setSelectedStatMode] = useState<StatType>('all')

  useEffect(() => {
    if (userId) {
      loadUserData()
    }
  }, [userId])

  async function loadUserData() {
    setLoading(true)

    // 0. 現在のログインユーザーID取得
    const stored = localStorage.getItem('namaste_user')
    let loginUserId: string | null = null
    if (stored) {
      const u = JSON.parse(stored)
      loginUserId = u.id
    } else {
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        loginUserId = authData.user.id
      }
    }
    setCurrentUserId(loginUserId)

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
      setEditAvatarUrl(pData.avatar_url || '')
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

    // 3. フォロー / フォロワー取得
    const [{ data: folData }, { data: ferData }] = await Promise.all([
      supabase.from('follows').select('following_id, profiles!follows_following_id_fkey(*)').eq('follower_id', userId),
      supabase.from('follows').select('follower_id, profiles!follows_follower_id_fkey(*)').eq('following_id', userId),
    ])

    if (folData) {
      setFollowingList(folData.map((f: any) => f.profiles).filter(Boolean))
    }
    const currentFollowers = ferData ? ferData.map((f: any) => f.profiles).filter(Boolean) : []
    setFollowerList(currentFollowers)

    // ログインユーザーがこのページの人をフォローしているか判定
    if (loginUserId && loginUserId !== userId) {
      const alreadyFollowing = currentFollowers.some((f: any) => f.id === loginUserId)
      setIsFollowing(alreadyFollowing)
    }

    // 4. ランク判定
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

    // 5. 評価アンケートの集計
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
        liked: calcStatsForIds(likedIds),
        bookmarked: calcStatsForIds(bookmarkedIds),
      })
    }

    setLoading(false)
  }

  // フォロー・フォロー解除の切替
  const handleToggleFollow = async () => {
    if (!currentUserId) {
      if (confirm('フォロー機能を利用するにはログインが必要です。\nログイン画面へ移動しますか？')) {
        router.push('/login')
      }
      return
    }

    setIsTogglingFollow(true)

    if (isFollowing) {
      // フォロー解除
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)

      if (!error) {
        setIsFollowing(false)
        setFollowerList((prev) => prev.filter((u) => u.id !== currentUserId))
      } else {
        alert('フォロー解除に失敗しました: ' + error.message)
      }
    } else {
      // フォロー登録
      const { error } = await supabase
        .from('follows')
        .insert([{ follower_id: currentUserId, following_id: userId }])

      if (!error) {
        setIsFollowing(true)
        // 自分のプロフィールを取得してフォロワーリストに追加
        const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', currentUserId).single()
        if (myProfile) {
          setFollowerList((prev) => [...prev, myProfile])
        }
      } else {
        alert('フォローに失敗しました: ' + error.message)
      }
    }

    setIsTogglingFollow(false)
  }

  // アバター画像選択ハンドラー
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('画像サイズが大きすぎます（最大2MBまで）。')
      return
    }
    setEditAvatarFile(file)
    setEditAvatarUrl(URL.createObjectURL(file))
  }

  // プロフィール更新処理
  const handleSaveProfile = async () => {
    if (!currentUserId) return
    setIsUpdating(true)

    try {
      let finalAvatarUrl = profile?.avatar_url || ''

      if (editAvatarFile) {
        const fileExt = editAvatarFile.name.split('.').pop()
        const fileName = `${currentUserId}-${Math.random()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { error: uploadErr } = await supabase.storage
          .from('recipe-images')
          .upload(filePath, editAvatarFile)

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from('recipe-images')
            .getPublicUrl(filePath)
          finalAvatarUrl = urlData.publicUrl
        }
      }

      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          username: editUsername,
          bio: editBio,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', currentUserId)

      if (profErr) throw profErr

      if (editPassword.trim()) {
        const { error: passErr } = await supabase.auth.updateUser({
          password: editPassword,
        })
        if (passErr) throw passErr
      }

      setProfile((prev: any) => ({
        ...prev,
        username: editUsername,
        bio: editBio,
        avatar_url: finalAvatarUrl,
      }))

      setIsEditModalOpen(false)
      setEditPassword('')
      alert('プロフィールを更新しました！')
    } catch (err: any) {
      alert('更新に失敗しました: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const currentStat = stats[selectedStatMode]

  const modeLabels: Record<StatType, { name: string; icon: string }> = {
    all: { name: '総合', icon: '✨' },
    liked: { name: 'いいねしたレシピ', icon: '❤️' },
    bookmarked: { name: '保存したレシピ', icon: '⭐' },
  }

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
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl border-2 border-amber-200 shadow-inner overflow-hidden shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <span>👳‍♂️</span>
                )}
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

                {/* フォロー中 / フォロワー数 表示 */}
                <div className="flex gap-4 text-xs font-bold pt-2 text-slate-600">
                  <button
                    onClick={() => {
                      setFollowModalType('following')
                      setIsFollowModalOpen(true)
                    }}
                    className="hover:text-amber-800 transition cursor-pointer"
                  >
                    フォロー中 <span className="text-amber-900 font-black">{followingList.length}</span> 人
                  </button>
                  <button
                    onClick={() => {
                      setFollowModalType('followers')
                      setIsFollowModalOpen(true)
                    }}
                    className="hover:text-amber-800 transition cursor-pointer"
                  >
                    フォロワー <span className="text-amber-900 font-black">{followerList.length}</span> 人
                  </button>
                </div>
              </div>
            </div>

            {/* 本人の場合は「プロフィール編集」、他人（他のバルマ）の場合は「フォロー」ボタンを表示 */}
            {isSelf ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-4 py-2 rounded-xl transition font-bold shadow-sm flex items-center gap-1.5 cursor-pointer self-end sm:self-center"
              >
                ✏️ プロフィール編集
              </button>
            ) : (
              <button
                onClick={handleToggleFollow}
                disabled={isTogglingFollow}
                className={`text-xs px-5 py-2.5 rounded-xl transition font-bold shadow-sm flex items-center gap-1.5 cursor-pointer self-end sm:self-center disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                }`}
              >
                {isFollowing ? '✓ フォロー中' : '＋ フォローする 👳‍♂️'}
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
                      : '2026/10/5'}
                  </p>
                </div>
              </div>
            </div>

            {/* 🍛 多角的傾向カード */}
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-amber-200/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{modeLabels[selectedStatMode].icon}</span>
                  <h3 className="text-xs font-black text-amber-950">
                    {modeLabels[selectedStatMode].name}傾向
                  </h3>
                </div>
                <div className="flex gap-1">
                  {(['all', 'liked', 'bookmarked'] as StatType[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedStatMode(m)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                        selectedStatMode === m
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {modeLabels[m].name}
                    </button>
                  ))}
                </div>
              </div>

              {currentStat.count === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  まだ評価データが集まっていません。
                </p>
              ) : (
                <div className="space-y-3 pt-1">
                  <AnimatedIconBar
                    label="味のテイスト"
                    value={currentStat.avgTaste}
                    minLabel="家庭的"
                    maxLabel="本格的"
                  />
                  <AnimatedIconBar
                    label="調理の手間"
                    value={currentStat.avgEffort}
                    minLabel="手軽・時短"
                    maxLabel="手が込んでいる"
                  />
                  <AnimatedIconBar
                    label="辛さレベル"
                    value={currentStat.avgSpiciness}
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
              className="bg-white rounded-2xl p-5 border border-amber-100/80 shadow-sm hover:shadow-md transition space-y-2 block relative group"
            >
              <div className="flex justify-between items-center">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {r.genre}
                </span>

                {/* 自分が投稿したレシピかつ投稿タブの場合に「編集」ボタンを表示 */}
                {isSelf && activeTab === 'posted' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(`/recipes/${r.id}/edit`)
                    }}
                    className="bg-slate-100 hover:bg-amber-500 text-slate-600 hover:text-white border border-slate-200 hover:border-amber-500 text-[11px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    ✏️ 編集
                  </button>
                )}
              </div>

              <h3 className="font-bold text-slate-800 text-sm">{r.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>
            </Link>
          ))}
        </div>

      </div>

      {/* ✏️ プロフィール編集モーダル */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-amber-100 shadow-2xl max-h-[90vh] overflow-y-auto">
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
              {/* アイコン画像 (アバター) 変更 */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">アイコン画像 (アバター)</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-amber-100 overflow-hidden border-2 border-amber-300 flex items-center justify-center text-2xl shrink-0">
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>👳‍♂️</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* バルマ名 (表示名) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">バルマ名 (表示名)</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="例: たかのり"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* 自己紹介文 */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">自己紹介文</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="好きなスパイスやこだわりの調理法など..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-amber-500 transition resize-none leading-relaxed"
                />
              </div>

              {/* パスワード変更 */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">新しいパスワード <span className="text-[10px] text-slate-400 font-normal">(変更する場合のみ入力)</span></label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="6文字以上の新しいパスワード"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-amber-500 transition"
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

      {/* 👥 フォロー / フォロワー リスト表示モーダル */}
      {isFollowModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-amber-100 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <span>👥</span> {followModalType === 'following' ? 'フォロー中のバルマ' : 'フォロワーのバルマ'}
              </h2>
              <button
                onClick={() => setIsFollowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {(followModalType === 'following' ? followingList : followerList).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">該当するバルマはいません。</p>
              ) : (
                (followModalType === 'following' ? followingList : followerList).map((u) => (
                  <Link
                    key={u.id}
                    href={`/users/${u.id}`}
                    onClick={() => setIsFollowModalOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-amber-50 transition border border-transparent hover:border-amber-200"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden border border-amber-300 flex items-center justify-center text-lg shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        <span>👳‍♂️</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="font-bold text-slate-800 truncate">{u.username}</div>
                      <div className="text-[10px] text-amber-800 font-semibold">{u.rank || '見習い'}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
