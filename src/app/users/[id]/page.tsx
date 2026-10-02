'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import GuestPromotionModal from '@/components/GuestPromotionModal'

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [userRecipes, setUserRecipes] = useState<any[]>([])
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<any[]>([])
  const [bookmarkedCount, setBookmarkedCount] = useState(0)
  const [myBookmarkCount, setMyBookmarkCount] = useState(0)
  
  const [followers, setFollowers] = useState<any[]>([])
  const [followings, setFollowings] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [activeModal, setActiveModal] = useState<'none' | 'followers' | 'followings' | 'deleteAccount'>('none')
  const [deleteEmailSent, setDeleteEmailSent] = useState(false)
  const [sendingDeleteEmail, setSendingDeleteEmail] = useState(false)

  const [activeRecipeTab, setActiveRecipeTab] = useState<'posted' | 'bookmarked'>('posted')

  const [isEditing, setIsEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    let user = null
    if (stored) {
      user = JSON.parse(stored)
      setCurrentUser(user)
    }

    async function loadUserData() {
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (profError || !profData) {
        setLoading(false)
        return
      }

      setProfile(profData)
      setEditUsername(profData.username || '')
      setEditBio(profData.bio || '')

      const { data: recipeData } = await supabase
        .from('recipes')
        .select('*')
        .or(`profile_id.eq.${id},author_name.eq.${profData.username}`)
        .order('created_at', { ascending: false })

      const recipes = recipeData || []
      setUserRecipes(recipes)

      if (recipes.length > 0) {
        const recipeIds = recipes.map((r) => r.id)
        const { count: receivedBmMkCount } = await supabase
          .from('recipe_bookmarks')
          .select('*', { count: 'exact', head: true })
          .in('recipe_id', recipeIds)

        setBookmarkedCount(receivedBmMkCount || 0)
      }

      const { data: myBmList } = await supabase
        .from('recipe_bookmarks')
        .select('recipe_id')
        .eq('user_id', id)

      if (myBmList && myBmList.length > 0) {
        setMyBookmarkCount(myBmList.length)
        const bmRecipeIds = myBmList.map((b) => b.recipe_id)
        const { data: bmRecipes } = await supabase
          .from('recipes')
          .select('*')
          .in('id', bmRecipeIds)

        setBookmarkedRecipes(bmRecipes || [])
      }

      const { data: followerRows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', id)

      if (followerRows && followerRows.length > 0) {
        const followerIds = followerRows.map((f) => f.follower_id)
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', followerIds)

        setFollowers(followerProfiles || [])
      }

      const { data: followingRows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', id)

      if (followingRows && followingRows.length > 0) {
        const followingIds = followingRows.map((f) => f.following_id)
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', followingIds)

        setFollowings(followingProfiles || [])
      }

      if (user) {
        const { data: followCheck } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', id)
          .maybeSingle()

        if (followCheck) setIsFollowing(true)
      }

      setLoading(false)
    }

    loadUserData()
  }, [id])

  const formatDaysAgo = (dateString?: string) => {
    if (!dateString) return '記録なし'
    const targetDate = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - targetDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    const formattedDate = `${targetDate.getFullYear()}/${targetDate.getMonth() + 1}/${targetDate.getDate()}`

    if (diffDays === 0) return `${formattedDate} (本日)`
    return `${formattedDate} (${diffDays}日前)`
  }

  const totalLikes = userRecipes.reduce((sum, r) => sum + (r.likes_count || 0), 0)
  const lastPostDate = userRecipes.length > 0 ? userRecipes[0].created_at : undefined

  const getRankInfo = (rank: string) => {
    switch (rank) {
      case 'マハラジャ':
        return { color: 'bg-amber-600 text-white border-amber-400', icon: '👑', nextRank: '最高位達成分', nextLikesReq: 0, nextPostsReq: 0 }
      case 'カレー賢者':
        return { color: 'bg-purple-600 text-white border-purple-300', icon: '🧙‍♂️', nextRank: 'マハラジャ', nextLikesReq: 150, nextPostsReq: 15 }
      case 'カレー愛好家':
        return { color: 'bg-orange-500 text-white border-orange-200', icon: '🍛', nextRank: 'カレー賢者', nextLikesReq: 50, nextPostsReq: 7 }
      case '一人前':
        return { color: 'bg-emerald-600 text-white border-emerald-200', icon: '🍳', nextRank: 'カレー愛好家', nextLikesReq: 15, nextPostsReq: 3 }
      default:
        return { color: 'bg-slate-500 text-white border-slate-300', icon: '🔰', nextRank: '一人前', nextLikesReq: 3, nextPostsReq: 1 }
    }
  }

  const handleToggleFollow = async () => {
    if (!currentUser) {
      if (confirm('フォローをするにはバルマ（会員）登録またはログインが必要です。\nログイン画面へ移動しますか？')) {
        router.push('/login')
      }
      return
    }

    if (isFollowing) {
      setIsFollowing(false)
      setFollowers((prev) => prev.filter((f) => f.id !== currentUser.id))

      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', id)
    } else {
      setIsFollowing(true)
      setFollowers((prev) => [...prev, currentUser])

      await supabase.from('follows').insert([
        {
          follower_id: currentUser.id,
          following_id: id,
        },
      ])

      await supabase.from('notifications').insert([
        {
          user_id: id,
          title: '👤 新しいフォロワーが届きました！',
          message: `「${currentUser.username}」さんがあなたをフォローしました。`,
          link_url: `/users/${currentUser.id}`,
        },
      ])
    }
  }

  const handleUnfollowUser = async (targetUserId: string, targetUsername: string) => {
    if (!window.confirm(`「${targetUsername}」さんのフォローを解除しますか？`)) return

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', id)
      .eq('following_id', targetUserId)

    if (error) {
      alert('解除に失敗しました: ' + error.message)
      return
    }

    setFollowings((prev) => prev.filter((f) => f.id !== targetUserId))
  }

  const handleSendDeleteAccountEmail = async () => {
    if (!currentUser || !currentUser.email) {
      alert('メールアドレス情報が取得できませんでした。再度ログインしてください。')
      return
    }

    setSendingDeleteEmail(true)

    try {
      const redirectUrl = `${window.location.origin}/auth/delete-account`
      const { error } = await supabase.auth.signInWithOtp({
        email: currentUser.email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (error) throw error

      setDeleteEmailSent(true)
    } catch (err: any) {
      alert('メール送信に失敗しました: ' + err.message)
    } finally {
      setSendingDeleteEmail(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('画像サイズが大きすぎます（最大2MBまで）。')
      e.target.value = ''
      return
    }
    setEditAvatarFile(file)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)

    try {
      let finalAvatarUrl = profile.avatar_url

      if (editAvatarFile) {
        const fileExt = editAvatarFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `public/avatars/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(filePath, editAvatarFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(filePath)

        finalAvatarUrl = publicUrlData.publicUrl
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: editUsername,
          bio: editBio,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', id)

      if (error) throw error

      if (newPassword) {
        if (newPassword.length < 6) {
          alert('パスワードは6文字以上で指定してください。')
          setUpdating(false)
          return
        }
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword })
        if (pwdError) throw pwdError
      }

      await supabase
        .from('recipes')
        .update({ author_name: editUsername })
        .eq('profile_id', id)

      const updatedProfile = { ...profile, username: editUsername, bio: editBio, avatar_url: finalAvatarUrl }
      setProfile(updatedProfile)

      if (currentUser && currentUser.id === id) {
        const updatedUser = { ...currentUser, username: editUsername, bio: editBio, avatar_url: finalAvatarUrl }
        localStorage.setItem('namaste_user', JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)
      }

      alert('プロフィール情報を更新しました！')
      setNewPassword('')
      setIsEditing(false)
    } catch (err: any) {
      alert('更新に失敗しました: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const isMyProfile = currentUser && currentUser.id === id
  const isOwnerOrAdmin = currentUser && (currentUser.id === id || currentUser.role === 'admin')

  if (loading) {
    return (
      <main className="min-h-screen bg-amber-50 p-10 flex justify-center items-center text-slate-500 text-sm">
        バルマカードを読み込み中...
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-amber-50 p-10 text-center">
        <p className="text-slate-600 mb-4">指定されたバルマが見つかりませんでした。</p>
        <Link href="/" className="text-amber-700 font-bold hover:underline text-sm">
          ← トップへ戻る
        </Link>
      </main>
    )
  }

  const rankInfo = getRankInfo(profile.rank || '見習い')
  const displayedRecipes = activeRecipeTab === 'posted' ? userRecipes : bookmarkedRecipes

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 relative">
      <GuestPromotionModal />

      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
          ← レシピ一覧に戻る
        </Link>

        {/* バルマカード */}
        <div className="bg-white rounded-3xl shadow-md border-2 border-amber-200 overflow-hidden relative p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-300 overflow-hidden shrink-0 flex items-center justify-center text-4xl shadow-inner">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <span>👳‍♂️</span>
              )}
            </div>

            <div className="space-y-3 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-slate-900">{profile.username}</h1>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${rankInfo.color}`}>
                  {rankInfo.icon} {profile.rank || '見習い'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
                {profile.bio || '自己紹介文はまだ設定されていません。'}
              </p>

              {/* 統計ボタン */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 text-center bg-amber-50/60 p-3 rounded-2xl border border-amber-100">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">投稿</div>
                  <div className="text-amber-800 font-black text-sm">{userRecipes.length} <span className="text-[10px] font-normal">件</span></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">獲得いいね</div>
                  <div className="text-amber-800 font-black text-sm">❤️ {totalLikes}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">獲得⭐保存</div>
                  <div className="text-amber-800 font-black text-sm">⭐ {bookmarkedCount}</div>
                </div>
                
                <button
                  onClick={() => setActiveModal('followers')}
                  className="hover:bg-amber-100/60 p-1 rounded-xl transition cursor-pointer"
                >
                  <div className="text-[10px] text-slate-500 font-bold">フォロワー ⚙️</div>
                  <div className="text-slate-800 font-black text-sm">{followers.length} <span className="text-[10px] font-normal">人</span></div>
                </button>

                <button
                  onClick={() => setActiveModal('followings')}
                  className="hover:bg-amber-100/60 p-1 rounded-xl transition cursor-pointer"
                >
                  <div className="text-[10px] text-slate-500 font-bold">フォロー中 ⚙️</div>
                  <div className="text-slate-800 font-black text-sm">{followings.length} <span className="text-[10px] font-normal">人</span></div>
                </button>
              </div>
            </div>

            <div className="shrink-0 flex sm:flex-col gap-2">
              {isMyProfile ? (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold py-2 px-4 rounded-xl text-xs transition shadow-sm"
                  >
                    ✏ プロフィール編集
                  </button>
                  <button
                    onClick={() => {
                      setDeleteEmailSent(false)
                      setActiveModal('deleteAccount')
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 px-3 rounded-xl text-xs transition shadow-sm"
                  >
                    🗑 退会
                  </button>
                </>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  className={`py-2 px-5 rounded-xl font-bold text-xs transition shadow-sm ${
                    isFollowing
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {isFollowing ? '✓ フォロー中' : '＋ フォローする'}
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <span>⏱</span> アカウント活動状況
              </div>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>最終投稿日:</span>
                  <strong className="text-slate-800">{formatDaysAgo(lastPostDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>最終ログイン:</span>
                  <strong className="text-slate-800">{formatDaysAgo(profile.last_login_at)}</strong>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-2">
              <div className="font-bold text-amber-900 flex items-center justify-between">
                <span>👑 ランク昇格ステータス</span>
                {profile.rank !== 'マハラジャ' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full">
                    次: {rankInfo.nextRank}
                  </span>
                )}
              </div>
              {profile.rank === 'マハラジャ' ? (
                <p className="text-xs text-amber-800 font-bold pt-1">
                  🎉 最高位「マハラジャ」達成済みです！
                </p>
              ) : (
                <div className="space-y-1 text-amber-900 text-xs">
                  <div className="flex justify-between">
                    <span>必要投稿数:</span>
                    <strong>{userRecipes.length} / {rankInfo.nextPostsReq} 件</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>必要獲得評価 (❤+⭐):</span>
                    <strong>{totalLikes + bookmarkedCount} / {rankInfo.nextLikesReq} 点</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <form onSubmit={handleUpdateProfile} className="mt-6 pt-6 border-t border-amber-200 space-y-4 bg-amber-50/50 p-4 rounded-2xl">
              <h3 className="font-bold text-sm text-amber-900">✏️ プロフィール・アカウント情報を変更</h3>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">バルマ名 (ユーザー名)</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">アイコン画像 (変更する場合のみ)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">自己紹介</label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-amber-200/60">
                <label className="block text-xs font-bold text-slate-600 mb-1">🔒 パスワードを変更する (任意)</label>
                <input
                  type="password"
                  placeholder="変更する場合のみ新しいパスワードを入力 (6文字以上)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                >
                  {updating ? '保存中...' : '変更を保存'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 投稿レシピ / お気に入りレシピ 切替 */}
        <section className="space-y-4">
          <div className="flex gap-3 border-b border-amber-200 pb-2">
            <button
              onClick={() => setActiveRecipeTab('posted')}
              className={`text-sm font-bold pb-2 border-b-2 transition ${
                activeRecipeTab === 'posted'
                  ? 'border-amber-600 text-amber-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              🍛 投稿したレシピ ({userRecipes.length})
            </button>
            <button
              onClick={() => setActiveRecipeTab('bookmarked')}
              className={`text-sm font-bold pb-2 border-b-2 transition ${
                activeRecipeTab === 'bookmarked'
                  ? 'border-amber-600 text-amber-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              ⭐ お気に入りレシピ ({myBookmarkCount})
            </button>
          </div>

          {displayedRecipes.length === 0 ? (
            <div className="bg-white/60 rounded-2xl border border-amber-200 p-8 text-center text-xs text-slate-500">
              {activeRecipeTab === 'posted' ? 'まだ投稿されたレシピはありません。' : 'お気に入り保存したレシピはありません。'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedRecipes.map((recipe) => (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block group">
                  <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm group-hover:shadow-md transition flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-xl bg-amber-100 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                      {recipe.image_url ? (
                        <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                      ) : (
                        <span>🍛</span>
                      )}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {recipe.genre}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition truncate">
                        {recipe.title}
                      </h3>
                      <div className="text-xs text-amber-600 font-semibold">❤️ {recipe.likes_count || 0}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* モーダル表示 */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-amber-100">
              <h3 className="font-bold text-base text-amber-900 flex items-center gap-2">
                <span>
                  {activeModal === 'followers'
                    ? '👥 フォロワー一覧'
                    : activeModal === 'followings'
                    ? '👤 フォロー中のバルマ一覧'
                    : '⚠️ アカウント退会手続き'}
                </span>
              </h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {(activeModal === 'followers' || activeModal === 'followings') && (
              <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                {(activeModal === 'followers' ? followers : followings).length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">該当するバルマはいません。</p>
                ) : (
                  (activeModal === 'followers' ? followers : followings).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between bg-amber-50/50 p-3 rounded-2xl border border-amber-100"
                    >
                      <Link
                        href={`/users/${user.id}`}
                        onClick={() => setActiveModal('none')}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden border border-amber-200 flex items-center justify-center text-lg">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <span>👳‍♂️</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{user.username}</div>
                          <div className="text-[10px] text-slate-500">{user.rank || '見習い'}</div>
                        </div>
                      </Link>

                      {isOwnerOrAdmin && activeModal === 'followings' && (
                        <button
                          onClick={() => handleUnfollowUser(user.id, user.username)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[10px] px-2.5 py-1 rounded-lg transition shrink-0"
                        >
                          解除
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeModal === 'deleteAccount' && (
              <div className="space-y-4 text-center">
                {deleteEmailSent ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                    <div className="text-2xl">✉️</div>
                    <h4 className="font-bold text-xs text-emerald-900">退会案内メールを送信しました</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      <strong>{currentUser?.email}</strong> 宛に退会確認リンクをお送りしました。メール内のURLをクリックして退会を完了してください。
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-600 leading-relaxed bg-red-50/80 border border-red-100 p-3 rounded-2xl">
                      退会すると、投稿したレシピや獲得した評価・お気に入りデータが**すべて完全に削除**されます。この操作は取り消せません。
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      誤操作防止のため、ご登録のメールアドレス宛に退会確認用リンクを送信します。
                    </p>

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => setActiveModal('none')}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleSendDeleteAccountEmail}
                        disabled={sendingDeleteEmail}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50"
                      >
                        {sendingDeleteEmail ? '送信中...' : '退会メールを送信する'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
