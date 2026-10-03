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
  const [ingredients, setIngredients] = useState<any[]>([])
  const [steps, setSteps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [likesCount, setLikesCount] = useState(0)
  const [hasLiked, setHasLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 評価アンケート用 State
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [userEval, setUserEval] = useState({
    score_taste: 3,
    score_effort: 3,
    score_ingredients: 3,
    score_spiciness: 3,
    score_style: 3,
  })
  const [hasEvaluated, setHasEvaluated] = useState(false)
  const [isSubmittingEval, setIsSubmittingEval] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    let user = null
    if (stored) {
      user = JSON.parse(stored)
      setCurrentUser(user)
    }

    async function loadRecipeData() {
      // レシピ基本情報取得
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        setRecipe(data)
        setLikesCount(data.likes_count || 0)

        // PV カウントアップ (+1)
        await supabase
          .from('recipes')
          .update({ pv_count: (data.pv_count || 0) + 1 })
          .eq('id', id)

        // 材料取得
        const { data: ingData } = await supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', id)
        if (ingData) setIngredients(ingData)

        // 手順取得
        const { data: stepData } = await supabase
          .from('recipe_steps')
          .select('*')
          .eq('recipe_id', id)
          .order('step_number', { ascending: true })
        if (stepData) setSteps(stepData)

        // 評価アンケート一覧取得
        const { data: evalData } = await supabase
          .from('recipe_evaluations')
          .select('*')
          .eq('recipe_id', id)

        if (evalData) {
          setEvaluations(evalData)
        }

        if (user) {
          // いいね状態確認
          const { data: likeData } = await supabase
            .from('recipe_likes')
            .select('*')
            .eq('recipe_id', id)
            .eq('user_id', user.id)
            .maybeSingle()
          if (likeData) setHasLiked(true)

          // お気に入り状態確認
          const { data: bmData } = await supabase
            .from('recipe_bookmarks')
            .select('*')
            .eq('recipe_id', id)
            .eq('user_id', user.id)
            .maybeSingle()
          if (bmData) setIsBookmarked(true)

          // 自分の評価アンケート確認
          const myEval = evalData?.find((e: any) => e.profile_id === user.id)
          if (myEval) {
            setHasEvaluated(true)
            setUserEval({
              score_taste: myEval.score_taste || 3,
              score_effort: myEval.score_effort || 3,
              score_ingredients: myEval.score_ingredients || 3,
              score_spiciness: myEval.score_spiciness || 3,
              score_style: myEval.score_style || 3,
            })
          }
        }
      }
      setLoading(false)
    }

    loadRecipeData()
  }, [id])

  // 平均評価スコアの計算
  const calcAvg = (key: string) => {
    if (evaluations.length === 0) return 3
    const sum = evaluations.reduce((acc, item) => acc + (item[key] || 3), 0)
    return Math.round((sum / evaluations.length) * 10) / 10
  }

  const avgTaste = calcAvg('score_taste')
  const avgEffort = calcAvg('score_effort')
  const avgIngredients = calcAvg('score_ingredients')
  const avgSpiciness = calcAvg('score_spiciness')
  const avgStyle = calcAvg('score_style')

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

  // アンケート送信（登録・上書き更新対応）
  const handleSaveEvaluation = async () => {
    if (!currentUser) {
      requireLoginAction()
      return
    }

    setIsSubmittingEval(true)

    const { data: existing } = await supabase
      .from('recipe_evaluations')
      .select('id')
      .eq('recipe_id', id)
      .eq('profile_id', currentUser.id)
      .maybeSingle()

    let saveErr = null

    if (existing) {
      const { error } = await supabase
        .from('recipe_evaluations')
        .update({
          ...userEval,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      saveErr = error
    } else {
      const { error } = await supabase
        .from('recipe_evaluations')
        .insert([{
          recipe_id: id,
          profile_id: currentUser.id,
          ...userEval,
        }])
      saveErr = error
    }

    if (saveErr) {
      alert('評価の保存に失敗しました: ' + saveErr.message)
    } else {
      alert(hasEvaluated ? 'レシピの印象傾向を更新（上書き）しました！👳‍♂️' : 'レシピの印象傾向を送信しました！👳‍♂️')
      setHasEvaluated(true)

      const newPayload = { recipe_id: id, profile_id: currentUser.id, ...userEval }
      const updatedList = evaluations.filter(e => e.profile_id !== currentUser.id)
      setEvaluations([...updatedList, newPayload])
    }
    setIsSubmittingEval(false)
  }

  // 統一した軸ラベル定義
  const evalCategories = [
    { key: 'score_taste', label: '味のテイスト', left: '家庭的・親しみやすい', right: '本格的・スパイシー', val: avgTaste },
    { key: 'score_effort', label: '調理の手間', left: '手軽・時短', right: '手が込んでいる', val: avgEffort },
    { key: 'score_ingredients', label: '材料の入手', left: 'スーパーで揃う', right: '専門店・通販', val: avgIngredients },
    { key: 'score_spiciness', label: '辛さレベル', left: 'マイルド・甘口', right: '激辛・スパイシー', val: avgSpiciness },
    { key: 'score_style', label: '主食ペアリング', left: '日本米に合う', right: 'ナン・エスニック米', val: avgStyle },
  ]

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
              <div className="text-xs text-slate-500 flex items-center gap-3">
                <div>
                  投稿者:
                  {recipe.profile_id ? (
                    <Link href={`/users/${recipe.profile_id}`} className="font-bold text-amber-800 hover:underline ml-1">
                      {recipe.author_name} 👳‍♂️
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-700 ml-1">{recipe.author_name}</span>
                  )}
                </div>
                <div className="text-slate-400">|</div>
                <div>👀 閲覧数: <span className="font-bold text-slate-700">{(recipe.pv_count || 0) + 1}</span> 回</div>
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

          {/* 🛒 材料 */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-2">
              <span>🛒</span> 材料 ({recipe.servings || '2人分'})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {ingredients.length > 0 ? (
                ingredients.map((ing: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex justify-between items-center">
                    <span className="font-medium text-slate-800">{ing.name || ing.ingredient_name}</span>
                    <span className="font-bold text-slate-500">{ing.amount || ing.quantity || ''}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">材料情報はありません。</p>
              )}
            </div>
          </div>

          {/* 👨‍🍳 作り方手順 */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-2">
              <span>👨‍🍳</span> 作り方手順
            </h2>
            <div className="space-y-2 text-xs">
              {steps.length > 0 ? (
                steps.map((st: any, idx: number) => (
                  <div key={idx} className="flex gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-800 shrink-0">{st.step_number || idx + 1}.</span>
                    <p className="text-slate-700 leading-relaxed">{st.instruction || st.step_description}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">手順情報はありません。</p>
              )}
            </div>
          </div>

          {/* 📊 レシピの印象・特徴アンケートセクション */}
          <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200/80 space-y-5">
            <div className="flex justify-between items-center border-b border-amber-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                  <span>📊</span> バルマたちのレシピ印象・傾向
                </h3>
                <p className="text-[11px] text-slate-500">（回答数: {evaluations.length}件）</p>
              </div>
            </div>

            {/* 平均評価バー */}
            <div className="space-y-3 text-xs">
              {evalCategories.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                    <span>{item.left}</span>
                    <span className="font-bold text-amber-900">{item.label} ({item.val})</span>
                    <span>{item.right}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${((item.val - 1) / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* アンケート回答フォーム */}
            <div className="pt-4 border-t border-amber-200 space-y-4">
              <h4 className="text-xs font-bold text-amber-900">
                {hasEvaluated ? '✏️ あなたの入力した印象傾向（何度でも変更可能）' : '✏️ このレシピの印象傾向を教えてください'}
              </h4>

              <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-100 text-xs">
                {evalCategories.map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="w-28 text-right font-medium text-slate-600 text-[11px] shrink-0">{row.left}</span>
                    <div className="flex gap-2 flex-1 justify-center">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setUserEval({ ...userEval, [row.key]: num })}
                          className={`w-7 h-7 rounded-full font-bold text-xs transition-all ${
                            (userEval as any)[row.key] === num
                              ? 'bg-amber-600 text-white shadow-sm scale-110'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <span className="w-28 text-left font-medium text-slate-600 text-[11px] shrink-0">{row.right}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSaveEvaluation}
                disabled={isSubmittingEval}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {isSubmittingEval ? '送信中...' : hasEvaluated ? '評価傾向を更新（上書き）する 👳‍♂️' : '評価傾向を送信する 👳‍♂️'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
