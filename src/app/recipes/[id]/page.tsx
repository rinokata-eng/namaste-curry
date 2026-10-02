'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import GuestPromotionModal from '@/components/GuestPromotionModal'
import { AnimatedLikeButton, AnimatedBookmarkButton } from '@/components/AnimatedActionButtons'

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [likesCount, setLikesCount] = useState(0)
  const [hasLiked, setHasLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    let user = null
    if (stored) {
      user = JSON.parse(stored)
      setCurrentUser(user)
    }

    async function loadRecipeData() {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        setRecipe(data)
        setLikesCount(data.likes_count || 0)

        if (user) {
          const { data: likeData } = await supabase
            .from('recipe_likes')
            .select('*')
            .eq('recipe_id', id)
            .eq('user_id', user.id)
            .maybeSingle()

          if (likeData) setHasLiked(true)

          const { data: bmData } = await supabase
            .from('recipe_bookmarks')
            .select('*')
            .eq('recipe_id', id)
            .eq('user_id', user.id)
            .maybeSingle()

          if (bmData) setIsBookmarked(true)
        }
      }
      setLoading(false)
    }

    loadRecipeData()
  }, [id])

  const requireLoginAction = () => {
    if (confirm('この機能を利用するにはバルマ（会員）登録またはログインが必要です。\nログイン画面へ移動しますか？')) {
      router.push('/login')
    }
  }

  const handleToggleLike = async (e: React.MouseEvent) => {
    if (!currentUser) {
      requireLoginAction()
      return
    }

    if (recipe.profile_id === currentUser.id || recipe.author_name === currentUser.username) {
      alert('ご自身の投稿レシピには「いいね」できません 👳‍♂️')
      return
    }

    if (hasLiked) {
      const newCount = Math.max(0, likesCount - 1)
      setLikesCount(newCount)
      setHasLiked(false)

      await supabase.from('recipes').update({ likes_count: newCount }).eq('id', id)
      await supabase.from('recipe_likes').delete().eq('recipe_id', id).eq('user_id', currentUser.id)
    } else {
      const newCount = likesCount + 1
      setLikesCount(newCount)
      setHasLiked(true)

      await supabase.from('recipes').update({ likes_count: newCount }).eq('id', id)
      await supabase.from('recipe_likes').insert([{ recipe_id: id, user_id: currentUser.id }])
    }
  }

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    if (!currentUser) {
      requireLoginAction()
      return
    }

    if (recipe.profile_id === currentUser.id || recipe.author_name === currentUser.username) {
      alert('ご自身の投稿レシピは「お気に入り保存」できません 👳‍♂️')
      return
    }

    if (isBookmarked) {
      setIsBookmarked(false)
      await supabase.from('recipe_bookmarks').delete().eq('recipe_id', id).eq('user_id', currentUser.id)
    } else {
      setIsBookmarked(true)
      await supabase.from('recipe_bookmarks').insert([{ recipe_id: id, user_id: currentUser.id }])
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-amber-50 p-10 flex justify-center items-center text-slate-500 text-sm">
        レシピを読み込み中...
      </main>
    )
  }

  if (!recipe) {
    return (
      <main className="min-h-screen bg-amber-50 p-10 text-center space-y-4">
        <p className="text-slate-600">レシピが見つかりませんでした。</p>
        <Link href="/" className="text-amber-700 font-bold hover:underline text-sm">
          ← トップへ戻る
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 relative">
      <GuestPromotionModal />

      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
          ← レシピ一覧に戻る
        </Link>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-amber-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-amber-100 pb-4">
            <div className="space-y-2">
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                {recipe.genre}
              </span>
              <h1 className="text-2xl font-black text-slate-900">{recipe.title}</h1>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>投稿者:</span>
                {recipe.profile_id ? (
                  <Link href={`/users/${recipe.profile_id}`} className="font-bold text-amber-800 hover:underline">
                    {recipe.author_name} 👳‍♂️
                  </Link>
                ) : (
                  <span className="font-bold text-slate-700">{recipe.author_name}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <AnimatedBookmarkButton
                isBookmarked={isBookmarked}
                onClick={handleToggleBookmark}
              />

              <AnimatedLikeButton
                likesCount={likesCount}
                isLiked={hasLiked}
                onClick={handleToggleLike}
              />
            </div>
          </div>

          {recipe.image_url && (
            <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-amber-100 border border-amber-200">
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
            </div>
          )}

          {recipe.description && (
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 text-xs text-slate-700 leading-relaxed">
              {recipe.description}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-2">
              <span>🛒</span> 材料 (2人分)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {recipe.ingredients ? (
                recipe.ingredients.split('\n').map((line: string, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    {line}
                  </div>
                ))
              ) : (
                <p className="text-slate-400">材料情報はありません。</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-2">
              <span>👨‍🍳</span> 作り方手順
            </h2>
            <div className="space-y-2 text-xs">
              {recipe.steps ? (
                recipe.steps.split('\n').map((step: string, idx: number) => (
                  <div key={idx} className="flex gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-800 shrink-0">{idx + 1}.</span>
                    <p className="text-slate-700 leading-relaxed">{step}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">手順情報はありません。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
