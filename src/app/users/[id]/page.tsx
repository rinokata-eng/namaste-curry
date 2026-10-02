'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const userId = resolvedParams.id
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRecipes, setUserRecipes] = useState<any[]>([])
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'recipes' | 'bookmarks'>('recipes')
  const [loading, setLoading] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    if (stored) {
      setCurrentUser(JSON.parse(stored))
    }

    async function fetchUserData() {
      setLoading(true)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (prof) {
        setProfile(prof)
        setUsername(prof.username || '')
        setBio(prof.bio || '')
        setAvatarUrl(prof.avatar_url || '')
      }

      const { data: recs } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (recs) setUserRecipes(recs)

      const { data: bmRows } = await supabase
        .from('recipe_bookmarks')
        .select('recipe_id')
        .eq('user_id', userId)

      if (bmRows && bmRows.length > 0) {
        const bmIds = bmRows.map((b) => b.recipe_id)
        const { data: bmRecipes } = await supabase
          .from('recipes')
          .select('*')
          .in('id', bmIds)
        if (bmRecipes) setBookmarkedRecipes(bmRecipes)
      }

      setLoading(false)
    }

    fetchUserData()
  }, [userId])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username, bio, avatar_url: avatarUrl })
        .eq('id', userId)

      if (error) throw error

      setProfile((prev: any) => ({ ...prev, username, bio, avatar_url: avatarUrl }))
      if (currentUser && currentUser.id === userId) {
        const updatedUser = { ...currentUser, username, bio, avatar_url: avatarUrl }
        localStorage.setItem('namaste_user', JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)
      }
      setIsEditing(false)
      alert('プロフィールを更新しました！')
    } catch (err: any) {
      alert('更新エラー: ' + err.message)
    }
  }

  const isOwner = currentUser && currentUser.id === userId

  if (loading) {
    return <div className="min-h-screen bg-amber-50 p-10 text-center text-slate-500 text-xs">読み込み中...</div>
  }

  if (!profile) {
    return <div className="min-h-screen bg-amber-50 p-10 text-center text-slate-500 text-xs">ユーザーが見つかりません。</div>
  }

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 space-y-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <Link href="/" className="text-xs font-bold text-amber-800 hover:underline inline-block">
          ← レシピ一覧に戻る
        </Link>

        {/* プロフィールカード */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-amber-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="w-20 h-20 rounded-full bg-amber-100 overflow-hidden border-2 border-amber-300 flex items-center justify-center text-3xl shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <span>👳‍♂️</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl font-black text-slate-900">{profile.username}</h1>
                  <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                    {profile.rank || '見習い'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{profile.bio || '自己紹介文はまだ設定されていません。'}</p>
              </div>
            </div>

            {isOwner && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-2 rounded-xl transition border border-amber-300 active:scale-95 whitespace-nowrap"
              >
                ✏️ プロフィール編集
              </button>
            )}
          </div>

          {/* 編集フォーム */}
          {isEditing && (
            <form onSubmit={handleUpdateProfile} className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 space-y-3 text-xs">
              <div>
                <label className="font-bold text-amber-900 block mb-1">ユーザー名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-amber-200 bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-amber-900 block mb-1">自己紹介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-amber-200 bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-amber-900 block mb-1">アバター画像URL</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 rounded-xl border border-amber-200 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
                >
                  保存する
                </button>
              </div>
            </form>
          )}

          {/* アカウント活動状況のみ（ランク昇格ステータスは完全に非表示） */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <span>⏱️</span> アカウント活動状況
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1">
              <div>投稿レシピ数: <strong className="text-slate-800">{userRecipes.length} 件</strong></div>
              <div>最終ログイン: <strong className="text-slate-800">{profile.last_login_at ? new Date(profile.last_login_at).toLocaleDateString() : '記録なし'}</strong></div>
            </div>
          </div>
        </div>

        {/* レシピ一覧タブ */}
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-amber-200 pb-3">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'recipes' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-amber-200'
              }`}
            >
              🍛 投稿したレシピ ({userRecipes.length})
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'bookmarks' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-amber-200'
              }`}
            >
              ⭐ お気に入りレシピ ({bookmarkedRecipes.length})
            </button>
          </div>

          {activeTab === 'recipes' ? (
            userRecipes.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-500 border border-amber-200">
                まだ投稿されたレシピはありません。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userRecipes.map((r) => (
                  <Link key={r.id} href={`/recipes/${r.id}`} className="block group">
                    <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm group-hover:shadow-md transition">
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                        {r.genre}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-700 mt-1 truncate">
                        {r.title}
                      </h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{r.description || '説明なし'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : bookmarkedRecipes.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-500 border border-amber-200">
              お気に入り保存したレシピはありません。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookmarkedRecipes.map((r) => (
                <Link key={r.id} href={`/recipes/${r.id}`} className="block group">
                  <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm group-hover:shadow-md transition">
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                      {r.genre}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-700 mt-1 truncate">
                      {r.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{r.description || '説明なし'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
