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

  // 感想機能
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [userEval, setUserEval] = useState({
    score_taste: 3,
    score_effort: 3,
    score_spiciness: 3,
  })
  const [hasEvaluated, setHasEvaluated] = useState(false)
  const [isSubmittingEval, setIsSubmittingEval] = useState(false)
  const [showThankYouAnimation, setShowThankYouAnimation] = useState(false)

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

        await supabase
          .from('recipes')
          .update({ pv_count: (data.pv_count || 0) + 1 })
          .eq('id', id)

        const [{ data: ingData }, { data: stepData }, { data: evalData }] = await Promise.all([
          supabase.from('recipe_ingredients').select('*').eq('recipe_id', id),
          supabase.from('recipe_steps').select('*').eq('recipe_id', id).order('step_number', { ascending: true }),
          supabase.from('recipe_evaluations').select('*').eq('recipe_id', id)
        ])

        if (ingData) setIngredients(ingData)
        if (stepData) setSteps(stepData)
        if (evalData) {
          setEvaluations(evalData)
          if (user) {
            const myEval = evalData.find((e: any) => e.profile_id === user.id)
            if (myEval) {
              setHasEvaluated(true)
              setUserEval({
                score_taste: myEval.score_taste || 3,
                score_effort: myEval.score_effort || 3,
                score_spiciness: myEval.score_spiciness || 3,
              })
            }
          }
        }

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

  const handleToggleLike = async () => {
    if (!currentUser) return requireLoginAction()
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

  const handleToggleBookmark = async () => {
    if (!currentUser) return requireLoginAction()
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

  // 感想届ける投稿
  const handleSubmitEvaluation = async () => {
    if (!currentUser) return requireLoginAction()

    if (recipe.profile_id === currentUser.id || recipe.author_name === currentUser.username) {
      alert('ご自身の投稿レシピには感想を届けられません 👳‍♂️')
      return
    }

    setIsSubmittingEval(true)
    try {
      const evalPayload = {
        recipe_id: id,
        profile_id: currentUser.id,
        score_taste: userEval.score_taste,
        score_effort: userEval.score_effort,
        score_spiciness: userEval.score_spiciness,
      }

      const { error } = await supabase
        .from('recipe_evaluations')
        .upsert([evalPayload], { onConflict: 'recipe_id,profile_id' })

      if (error) throw error

      setHasEvaluated(true)
      setShowThankYouAnimation(true)
      setTimeout(() => {
        setShowThankYouAnimation(false)
      }, 3500)

      const { data: updatedEvals } = await supabase
        .from('recipe_evaluations')
        .select('*')
        .eq('recipe_id', id)
      if (updatedEvals) setEvaluations(updatedEvals)
    } catch (err: any) {
      alert('送信エラー: ' + err.message)
    } finally {
      setIsSubmittingEval(false)
    }
  }

  const calcAvg = (key: string) => {
    if (evaluations.length === 0) return 3.0
    const sum = evaluations.reduce((acc, item) => acc + (item[key] || 3), 0)
    return Math.round((sum / evaluations.length) * 10) / 10
  }

  if (loading) {
    return <main className="min-h-screen bg-amber-50 p-10 text-center text-slate-500 text-sm">レシピを読み込み中...</main>
  }

  if (!recipe) {
    return (
      <main className="min-h-screen bg-amber-50 p-10 text-center space-y-4">
        <p className="text-slate-600">レシピが見つかりませんでした。</p>
        <Link href="/" className="text-amber-700 font-bold hover:underline text-sm">← トップへ戻る</Link>
      </main>
    )
  }

  const typesArr = recipe.feature_type ? recipe.feature_type.split(',') : []
  const isOwner = currentUser && (recipe.profile_id === currentUser.id || recipe.author_name === currentUser.username)

  const tasteAvg = calcAvg('score_taste')
  const effortAvg = calcAvg('score_effort')
  const spicinessAvg = calcAvg('score_spiciness')

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 relative overflow-hidden">
      <GuestPromotionModal />

      {/* 感謝のアニメーションオーバーレイ */}
      {showThankYouAnimation && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in pointer-events-none p-4">
          <div className="bg-white rounded-3xl p-8 border-4 border-amber-400 shadow-2xl text-center space-y-3 transform animate-bounce">
            <div className="text-5xl">🎉 🍛 ✨</div>
            <h3 className="text-xl font-black text-amber-900">感想を届けました！</h3>
            <p className="text-xs font-bold text-slate-600">素敵な感想をありがとうございます 👳‍♂️</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
            ← レシピ一覧に戻る
          </Link>

          {isOwner && (
            <Link
              href={`/recipes/${id}/edit`}
              className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 rounded-xl shadow-xs transition"
            >
              ✏️ レシピを編集・削除
            </Link>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-amber-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-amber-100 pb-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  {recipe.genre}
                </span>
                {typesArr.map((t: string) => (
                  <span key={t} className="bg-amber-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-xs">
                    🔥 {t}
                  </span>
                ))}
              </div>
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
              <AnimatedBookmarkButton isBookmarked={isBookmarked} onClick={handleToggleBookmark} />
              <AnimatedLikeButton likesCount={likesCount} isLiked={hasLiked} onClick={handleToggleLike} />
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

            {ingredients.length === 0 ? (
              <p className="text-slate-400 text-xs">材料情報はありません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {ingredients.map((ing: any, idx: number) => {
                  const ingName = ing.name || ing.ingredient_name || ''
                  const ingAmount = ing.amount || ing.quantity || ''
                  
                  const rawAmazon = ing.amazon_url || ''
                  const rawRakuten = ing.rakuten_url || ''
                  const rawLink = ing.link_url || ''

                  const amazonUrl = rawAmazon || (rawLink.includes('amazon') ? rawLink : '')
                  const rakutenUrl = rawRakuten || (rawLink.includes('rakuten') ? rawLink : '')

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                        ing.is_featured
                          ? 'bg-amber-100/90 border-amber-400 shadow-xs'
                          : 'bg-slate-50 border-slate-200/60'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          {ing.is_featured && <span className="text-amber-600 font-black">🔥</span>}
                          {ingName}
                        </span>
                        <span className="font-bold text-slate-600 shrink-0">
                          {ingAmount ? ingAmount : <span className="text-slate-400 font-normal">適量</span>}
                        </span>
                      </div>

                      {(amazonUrl || rakutenUrl) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                          {amazonUrl && (
                            <a
                              href={amazonUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-black text-amber-950 bg-amber-300 hover:bg-amber-400 px-2.5 py-1 rounded-lg transition"
                            >
                              <span>🛒</span> Amazonで見る ↗
                            </a>
                          )}
                          {rakutenUrl && (
                            <a
                              href={rakutenUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg transition"
                            >
                              <span>🛍️</span> 楽天で見る ↗
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 👨‍🍳 作り方手順 */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-2">
              <span>👨‍🍳</span> 作り方手順
            </h2>

            {steps.length === 0 ? (
              <p className="text-slate-400 text-xs">手順情報はありません。</p>
            ) : (
              <div className="space-y-3 text-xs">
                {steps.map((st: any, idx: number) => {
                  const instructionText = st.instruction || st.step_description || ''
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-2 ${
                        st.is_featured
                          ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-400 shadow-sm'
                          : 'bg-amber-50/40 border-amber-100'
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        <span className="font-black text-amber-800 shrink-0 text-sm">{st.step_number || idx + 1}.</span>
                        <div className="space-y-1 flex-1">
                          {st.is_featured && (
                            <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] px-2 py-0.5 rounded-md mb-1">
                              🔥 秘伝のこだわり手順
                            </span>
                          )}
                          <p className={`leading-relaxed ${st.is_featured ? 'text-slate-900 font-bold text-xs' : 'text-slate-800 font-medium'}`}>
                            {instructionText}
                          </p>
                        </div>
                      </div>

                      {st.image_url && (
                        <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-100 border border-amber-200 mt-2">
                          <img src={st.image_url} alt={`Step ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 📊 みんなのレシピ感想エリア */}
          <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200 space-y-5">
            <div className="border-b border-amber-200 pb-2 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                  <span>📊</span> みんなのレシピ感想
                </h3>
                <p className="text-[11px] text-slate-500">（全 {evaluations.length} 件の感想）</p>
              </div>
            </div>

            {/* 平均スコアメーター表示 */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-100 text-xs">
              {/* 味のテイスト */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>🏠 家庭的</span>
                  <span className="font-bold text-amber-900">味のテイスト: {tasteAvg} / 5.0</span>
                  <span>🌿 本格スパイシー</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full relative overflow-visible mt-1">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-sm transition-all duration-500 drop-shadow-xs"
                    style={{ left: `${((tasteAvg - 1) / 4) * 100}%` }}
                  >
                    🍛
                  </div>
                </div>
              </div>

              {/* 調理の手間 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>⚡爆速・時短</span>
                  <span className="font-bold text-amber-900">調理の手間: {effortAvg} / 5.0</span>
                  <span>🍳 じっくりこだわり</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full relative overflow-visible mt-1">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-sm transition-all duration-500 drop-shadow-xs"
                    style={{ left: `${((effortAvg - 1) / 4) * 100}%` }}
                  >
                    ⏱
                  </div>
                </div>
              </div>

              {/* 辛さレベル */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>🍯 甘口・マイルド</span>
                  <span className="font-bold text-amber-900">辛さレベル: {spicinessAvg} / 5.0</span>
                  <span>🔥 激辛スパイシー</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full relative overflow-visible mt-1">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-sm transition-all duration-500 drop-shadow-xs"
                    style={{ left: `${((spicinessAvg - 1) / 4) * 100}%` }}
                  >
                    🌶️
                  </div>
                </div>
              </div>
            </div>

            {/* 感想お届けフォーム */}
            {isOwner ? (
              <div className="bg-amber-100/60 p-4 rounded-xl border border-amber-200 text-center">
                <p className="text-xs font-bold text-amber-900">
                  👳‍♂️ ご自身の投稿レシピには感想を届けられません。
                </p>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-amber-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  ✍️ あなたの感想を届けてください
                </h4>

                <div className="space-y-3 text-xs">
                  {/* 味 */}
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">🍛 味のテイスト:</span>
                      <span className="text-amber-700">{userEval.score_taste} / 5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs shrink-0">🏠</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={userEval.score_taste}
                        onChange={e => setUserEval({ ...userEval, score_taste: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <span className="text-xs shrink-0">🌿</span>
                    </div>
                  </div>

                  {/* 手間 */}
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">⏱️ 調理の手間:</span>
                      <span className="text-amber-700">{userEval.score_effort} / 5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs shrink-0">⚡</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={userEval.score_effort}
                        onChange={e => setUserEval({ ...userEval, score_effort: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <span className="text-xs shrink-0">🍳</span>
                    </div>
                  </div>

                  {/* 辛さ */}
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">🌶️ 辛さレベル:</span>
                      <span className="text-amber-700">{userEval.score_spiciness} / 5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs shrink-0">🍯</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={userEval.score_spiciness}
                        onChange={e => setUserEval({ ...userEval, score_spiciness: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <span className="text-xs shrink-0">🔥</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitEvaluation}
                  disabled={isSubmittingEval}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmittingEval ? '送信中...' : hasEvaluated ? '感想を再更新して届ける 👳‍♂️' : '感想を届ける 👳‍♂️'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
