'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AnimatedLikeButton, AnimatedBookmarkButton } from '@/components/AnimatedActionButtons'
import GuestPromotionModal from '@/components/GuestPromotionModal'

export default function HomePage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<any[]>([])
  const [featuredRecipes, setFeaturedRecipes] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<any[]>([])
  const [followingUsers, setFollowingUsers] = useState<any[]>([])
  const [userLikedRecipeIds, setUserLikedRecipeIds] = useState<string[]>([])
  const [userBookmarkedRecipeIds, setUserBookmarkedRecipeIds] = useState<string[]>([])
  
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')
  const [rankCategoryIndex, setRankCategoryIndex] = useState(0)
  const [heroMsgIndex, setHeroMsgIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarks' | 'following'>('all')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('すべて')

  const genres = ['すべて', 'スパイスカレー', '欧風カレー', 'スープカレー', 'キーマカレー', 'インドカレー', 'その他']
  const rankCategories = [
    { title: '🏆 累計いいね獲得ランキング', badge: '累計TOP' },
    { title: '🌙 今月の月間いいね獲得ランキング', badge: '月間TOP' },
    { title: '🔥 今週の週間いいね獲得ランキング', badge: '週間TOP' },
  ]

  const heroMessages = [
    <>あなたの隠し味、<br />教えてくれませんか？</>,
    <>今日食べたいカレー、<br />きっと見つかる。</>,
    <>スパイスの数だけ、<br />物語がある。</>,
  ]

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    let user = null
    if (stored) {
      user = JSON.parse(stored)
      setCurrentUser(user)
    }

    async function fetchData() {
      const { data: recipeData } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (recipeData) {
        setRecipes(recipeData)
        const sorted = [...recipeData].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
        setFeaturedRecipes(sorted.slice(0, 5))
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profileData) {
        setAllUsers(profileData)
      }

      if (user) {
        const { data: likeRows } = await supabase
          .from('recipe_likes')
          .select('recipe_id')
          .eq('user_id', user.id)

        if (likeRows) {
          setUserLikedRecipeIds(likeRows.map((l) => l.recipe_id))
        }

        const { data: bmRows } = await supabase
          .from('recipe_bookmarks')
          .select('recipe_id')
          .eq('user_id', user.id)

        if (bmRows && bmRows.length > 0) {
          const bmIds = bmRows.map((b) => b.recipe_id)
          setUserBookmarkedRecipeIds(bmIds)

          const { data: bmData } = await supabase
            .from('recipes')
            .select('*')
            .in('id', bmIds)
          if (bmData) setBookmarkedRecipes(bmData)
        }

        const { data: folRows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)

        if (folRows && folRows.length > 0) {
          const folIds = folRows.map((f) => f.following_id)
          const { data: folProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', folIds)
          if (folProfiles) setFollowingUsers(folProfiles)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroMsgIndex((prev) => (prev + 1) % heroMessages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (featuredRecipes.length <= 1) return
    const timer = setInterval(() => {
      setSlideDirection('left')
      setFeaturedIndex((prev) => (prev + 1) % featuredRecipes.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [featuredRecipes])

  useEffect(() => {
    const timer = setInterval(() => {
      setRankCategoryIndex((prev) => (prev + 1) % rankCategories.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  const handlePrevFeatured = () => {
    setSlideDirection('right')
    setFeaturedIndex((prev) => (prev - 1 + featuredRecipes.length) % featuredRecipes.length)
  }

  const handleNextFeatured = () => {
    setSlideDirection('left')
    setFeaturedIndex((prev) => (prev + 1) % featuredRecipes.length)
  }

  const handleLogout = () => {
    localStorage.removeItem('namaste_user')
    setCurrentUser(null)
    alert('ログアウトしました。')
    router.refresh()
  }

  const handleNewRecipeClick = (e: React.MouseEvent) => {
    if (!currentUser) {
      e.preventDefault()
      if (confirm('レシピを投稿するにはバルマ（会員）登録またはログインが必要です。\nログイン画面へ移動しますか？')) {
        router.push('/login')
      }
    }
  }

  const handleCardLike = async (e: React.MouseEvent, recipe: any) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUser) {
      if (confirm('いいねをするにはバルマ（会員）登録またはログインが必要です。\nログイン画面へ移動しますか？')) {
        router.push('/login')
      }
      return
    }

    if (recipe.profile_id === currentUser.id || recipe.author_name === currentUser.username) {
      alert('ご自身の投稿レシピには「いいね」できません 👳‍♂️')
      return
    }

    const hasLiked = userLikedRecipeIds.includes(recipe.id)
    const newLikesCount = hasLiked ? Math.max(0, (recipe.likes_count || 0) - 1) : (recipe.likes_count || 0) + 1

    setRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, likes_count: newLikesCount } : r))
    )
    setFeaturedRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, likes_count: newLikesCount } : r))
    )

    if (hasLiked) {
      setUserLikedRecipeIds((prev) => prev.filter((id) => id !== recipe.id))
      await supabase.from('recipes').update({ likes_count: newLikesCount }).eq('id', recipe.id)
      await supabase.from('recipe_likes').delete().eq('recipe_id', recipe.id).eq('user_id', currentUser.id)
    } else {
      setUserLikedRecipeIds((prev) => [...prev, recipe.id])
      await supabase.from('recipes').update({ likes_count: newLikesCount }).eq('id', recipe.id)
      await supabase.from('recipe_likes').insert([{ recipe_id: recipe.id, user_id: currentUser.id }])
    }
  }

  const handleCardBookmark = async (e: React.MouseEvent, recipe: any) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUser) {
      if (confirm('お気に入り保存をするにはバルマ（会員）登録またはログインが必要です。\nログイン画面へ移動しますか？')) {
        router.push('/login')
      }
      return
    }

    if (recipe.profile_id === currentUser.id || recipe.author_name === currentUser.username) {
      alert('ご自身の投稿レシピは「お気に入り保存」できません 👳‍♂️')
      return
    }

    const isBookmarked = userBookmarkedRecipeIds.includes(recipe.id)

    if (isBookmarked) {
      setUserBookmarkedRecipeIds((prev) => prev.filter((id) => id !== recipe.id))
      setBookmarkedRecipes((prev) => prev.filter((r) => r.id !== recipe.id))
      await supabase.from('recipe_bookmarks').delete().eq('recipe_id', recipe.id).eq('user_id', currentUser.id)
    } else {
      setUserBookmarkedRecipeIds((prev) => [...prev, recipe.id])
      setBookmarkedRecipes((prev) => [recipe, ...prev])
      await supabase.from('recipe_bookmarks').insert([{ recipe_id: recipe.id, user_id: currentUser.id }])
    }
  }

  const getBaseRecipes = () => {
    if (activeTab === 'bookmarks') return bookmarkedRecipes
    if (activeTab === 'following') {
      const followingNames = followingUsers.map(u => u.username)
      return recipes.filter(r => followingNames.includes(r.author_name))
    }
    return recipes
  }

  // 検索条件（タイトル、説明文、作者名、こだわりタグ・特化テキスト）
  const filteredRecipes = getBaseRecipes().filter((r) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.author_name?.toLowerCase().includes(q) ||
      r.feature_type?.toLowerCase().includes(q) ||
      r.feature_detail?.toLowerCase().includes(q)

    const matchesGenre = selectedGenre === 'すべて' || r.genre === selectedGenre

    return matchesSearch && matchesGenre
  })

  const currentRankCategory = rankCategories[rankCategoryIndex]

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 space-y-8 overflow-x-hidden">
      <GuestPromotionModal />

      {/* ヘッダー */}
      <header className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur p-4 md:p-6 rounded-3xl border border-amber-200 shadow-sm">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-3xl transition transform group-hover:scale-110">👳‍♂️</span>
          <div>
            <h1 className="text-xl font-black text-amber-900 tracking-wide">NAMASTE</h1>
            <p className="text-xs text-amber-700 font-medium">カレー好きのための秘伝レシピ交換所</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/baluma-rank"
            className="text-xs font-bold text-amber-800 hover:text-amber-900 px-3.5 py-2 border border-amber-300 rounded-xl bg-amber-50/50 transition active:scale-95 flex items-center gap-1"
          >
            <span>✨</span> バルマとは？
          </Link>

          {currentUser ? (
            <div className="flex items-center gap-3">
              <Link
                href={`/users/${currentUser.id}`}
                className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 py-1.5 px-3 rounded-full text-xs font-bold text-amber-900 transition border border-amber-300 active:scale-95"
              >
                <span>👤 {currentUser.username}</span>
                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full">
                  {currentUser.rank || '見習い'}
                </span>
              </Link>
              {currentUser.role === 'admin' && (
                <Link href="/admin" className="text-xs bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl transition active:scale-95">
                  👑 管理
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 transition active:scale-95"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="text-xs font-bold text-amber-800 hover:text-amber-900 px-3.5 py-2 border border-amber-300 rounded-xl bg-amber-50/50 transition active:scale-95"
              >
                🔑 ログイン
              </Link>
              <Link
                href="/users/new"
                className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl shadow-sm transition active:scale-95"
              >
                ✨ 新規バルマ登録
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* メインヒーロー */}
      <section className="max-w-4xl mx-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-6 md:p-10 shadow-md flex flex-col md:flex-row justify-between items-center md:items-center gap-6">
        <div className="space-y-3 text-left min-h-[100px] flex flex-col w-full md:w-auto">
          <div key={heroMsgIndex} className="animate-fade-in-out">
            <h2 className="text-2xl md:text-3xl font-black leading-tight">
              {heroMessages[heroMsgIndex]}
            </h2>
          </div>
          <p className="text-xs opacity-90 leading-relaxed max-w-md">
            スパイスの配合から調理の隠し味まで。全国のバルマが投稿したこだわりの本格カレーレシピが集まるプラットフォームです。
          </p>
        </div>

        <Link
          href="/recipes/new"
          onClick={handleNewRecipeClick}
          className="bg-white text-amber-900 font-black text-sm py-3.5 px-8 rounded-2xl shadow-lg hover:bg-amber-50 transition transform hover:-translate-y-0.5 active:scale-95 shrink-0 mx-auto md:mx-0"
        >
          🍛 レシピを投稿する
        </Link>
      </section>

      {/* ⭐ 注目のレシピ */}
      {featuredRecipes.length > 0 && (
        <section className="max-w-4xl mx-auto space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
              <span>⭐ 今注目の人気レシピ</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrevFeatured}
                className="w-8 h-8 rounded-full bg-white border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center hover:bg-amber-100 transition active:scale-90 shadow-sm"
              >
                ◀
              </button>
              <button
                onClick={handleNextFeatured}
                className="w-8 h-8 rounded-full bg-white border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center hover:bg-amber-100 transition active:scale-90 shadow-sm"
              >
                ▶
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300 shadow-sm bg-white min-h-[200px]">
            {featuredRecipes.map((recipe, idx) => {
              if (idx !== featuredIndex) return null
              const isLiked = userLikedRecipeIds.includes(recipe.id)
              const isBm = userBookmarkedRecipeIds.includes(recipe.id)

              return (
                <div
                  key={recipe.id}
                  className={`p-5 md:p-6 ${
                    slideDirection === 'left' ? 'animate-slide-left-slow' : 'animate-slide-right-slow'
                  }`}
                >
                  <Link href={`/recipes/${recipe.id}`} className="block group">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                      <div className="w-full md:w-64 h-44 rounded-2xl bg-amber-100 overflow-hidden shrink-0 flex items-center justify-center text-4xl shadow-inner relative">
                        <span className="absolute top-2 left-2 bg-amber-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow z-10">
                          PICK UP #{idx + 1}
                        </span>
                        {recipe.image_url ? (
                          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                        ) : (
                          <span>🍛</span>
                        )}
                      </div>
                      <div className="space-y-2 flex-1 text-center md:text-left">
                        <div className="flex flex-wrap items-center gap-1.5 justify-center md:justify-start">
                          <span className="inline-block text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                            {recipe.genre}
                          </span>
                          {recipe.feature_type && (
                            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-md shadow-xs">
                              🔥 {recipe.feature_type}
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-xl text-slate-900 group-hover:text-amber-700 transition">
                          {recipe.title}
                        </h4>

                        {/* 秘伝ポイント表示 */}
                        {recipe.feature_detail && (
                          <p className="text-xs font-bold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200/60 inline-block">
                            💡 {recipe.feature_detail}
                          </p>
                        )}

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {recipe.description || '説明文はまだありません。'}
                        </p>
                        
                        <div className="flex justify-center md:justify-start items-center gap-3 pt-2">
                          <span className="text-xs text-slate-500">👤 投稿者: <strong className="text-slate-800">{recipe.author_name}</strong></span>

                          <div className="flex gap-2 ml-auto">
                            <AnimatedBookmarkButton
                              isBookmarked={isBm}
                              onClick={(e) => handleCardBookmark(e, recipe)}
                            />

                            <AnimatedLikeButton
                              likesCount={recipe.likes_count || 0}
                              isLiked={isLiked}
                              onClick={(e) => handleCardLike(e, recipe)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 👳‍♂️ 注目のバルマ */}
      {allUsers.length > 0 && (
        <section className="max-w-4xl mx-auto space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
              <span>👳‍♂️ 注目のバルマ</span>
            </h3>
            <div className="flex gap-1.5">
              {rankCategories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setRankCategoryIndex(idx)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition active:scale-90 ${
                    rankCategoryIndex === idx
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-slate-500 border border-amber-200'
                  }`}
                >
                  {cat.badge}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-sm overflow-hidden min-h-[110px] relative">
            <div key={rankCategoryIndex} className="animate-slide-right-slow space-y-2">
              <div className="text-xs font-bold text-amber-900 border-b border-amber-100 pb-2">
                {currentRankCategory.title}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {allUsers.slice(0, 3).map((u, i) => (
                  <Link key={u.id} href={`/users/${u.id}`} className="block group">
                    <div className="bg-amber-50/60 hover:bg-amber-100/80 p-3 rounded-2xl border border-amber-200/80 transition transform group-hover:-translate-y-0.5 active:scale-95 flex items-center gap-3">
                      <span className="font-black text-amber-800 text-sm">#{i + 1}</span>
                      <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden border-2 border-amber-300 flex items-center justify-center text-lg shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          <span>👳‍♂️</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 truncate group-hover:text-amber-700">
                          {u.username}
                        </div>
                        <div className="text-[10px] text-amber-800 font-semibold truncate">
                          {u.rank || '見習い'}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 🔍 検索 ＆ フィルターバー */}
      <section className="max-w-4xl mx-auto bg-white p-4 rounded-3xl border border-amber-200 shadow-sm space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 レシピ名、隠し味、こだわり（時短/スパイス等）、作者名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-amber-200 rounded-2xl py-2.5 px-4 text-sm bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition active:scale-95 ${
                selectedGenre === g
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      {/* 🔥 レシピ一覧 ＆ タブ切り替え */}
      <section className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-amber-200 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                activeTab === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              🔥 全てのレシピ ({recipes.length})
            </button>

            {currentUser && (
              <>
                <button
                  onClick={() => setActiveTab('bookmarks')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                    activeTab === 'bookmarks'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  ⭐ お気に入り保存 ({bookmarkedRecipes.length})
                </button>

                <button
                  onClick={() => setActiveTab('following')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                    activeTab === 'following'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  👥 フォロー中のバルマ ({followingUsers.length})
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">データを読み込み中...</div>
        ) : activeTab === 'following' ? (
          followingUsers.length === 0 ? (
            <div className="bg-white/60 rounded-3xl border border-amber-200 p-10 text-center text-xs text-slate-500">
              フォローしているバルマはまだいません。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {followingUsers.map((user) => (
                <Link key={user.id} href={`/users/${user.id}`} className="block group">
                  <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm group-hover:shadow-md transition transform group-hover:-translate-y-0.5 active:scale-95 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-amber-100 overflow-hidden border-2 border-amber-300 flex items-center justify-center text-2xl shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <span>👳‍♂️</span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 group-hover:text-amber-700">{user.username}</div>
                      <div className="text-xs text-amber-800 font-semibold">{user.rank || '見習い'}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{user.bio || '自己紹介なし'}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : filteredRecipes.length === 0 ? (
          <div className="bg-white/60 rounded-3xl border border-amber-200 p-10 text-center space-y-3">
            <p className="text-slate-500 text-sm">該当するレシピが見つかりませんでした。</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedGenre('すべて')
              }}
              className="text-xs text-amber-700 font-bold hover:underline"
            >
              検索条件をリセット
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecipes.map((recipe) => {
              const isLiked = userLikedRecipeIds.includes(recipe.id)
              const isBm = userBookmarkedRecipeIds.includes(recipe.id)

              return (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block group">
                  <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm group-hover:shadow-md transition transform group-hover:-translate-y-0.5 active:scale-[0.99] flex gap-4 items-center relative">
                    <div className="w-24 h-24 rounded-2xl bg-amber-100 overflow-hidden shrink-0 flex items-center justify-center text-3xl">
                      {recipe.image_url ? (
                        <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                      ) : (
                        <span>🍛</span>
                      )}
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                          {recipe.genre}
                        </span>
                        {recipe.feature_type && (
                          <span className="bg-amber-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md">
                            🔥 {recipe.feature_type}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base text-slate-900 group-hover:text-amber-700 transition truncate">
                        {recipe.title}
                      </h4>

                      {/* レシピカード上の秘伝テキスト枠 */}
                      {recipe.feature_detail ? (
                        <p className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-200/60 truncate">
                          💡 {recipe.feature_detail}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 truncate">{recipe.description || '説明なし'}</p>
                      )}
                      
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 text-slate-400">
                        <span>👤 {recipe.author_name}</span>

                        <div className="flex gap-1.5">
                          <AnimatedBookmarkButton
                            isBookmarked={isBm}
                            onClick={(e) => handleCardBookmark(e, recipe)}
                          />

                          <AnimatedLikeButton
                            likesCount={recipe.likes_count || 0}
                            isLiked={isLiked}
                            onClick={(e) => handleCardLike(e, recipe)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* フッター */}
      <footer className="max-w-4xl mx-auto pt-8 border-t border-amber-200 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
        <div>© 2026 NAMASTE Curry Exchange. All rights reserved.</div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:underline">利用規約</Link>
          <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
          <Link href="/contact" className="hover:underline">お問い合わせ</Link>
        </div>
      </footer>
    </main>
  )
}
