'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'

export default function NewRecipePage() {
  const router = useRouter()

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdRecipeId, setCreatedRecipeId] = useState('')

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('スパイスカレー')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('2人前')
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)

  const [ingredients, setIngredients] = useState([
    { name: '', affiliate_url: '' },
  ])

  const [steps, setSteps] = useState([
    { instruction: '', imageFile: null as File | null, image_comment: '' },
  ])

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    if (stored) {
      setCurrentUser(JSON.parse(stored))
    }
  }, [])

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', affiliate_url: '' }])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleAddStep = () => {
    setSteps([...steps, { instruction: '', imageFile: null, image_comment: '' }])
  }

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#d97706', '#b45309', '#ef4444', '#10b981'],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('レシピタイトルを入力してください。')
      return
    }

    setSubmitting(true)

    try {
      let mainImageUrl = ''
      if (coverImageFile) {
        const fileExt = coverImageFile.name.split('.').pop()
        const fileName = `${Date.now()}_cover.${fileExt}`
        const filePath = `public/recipes/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(filePath, coverImageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(filePath)

        mainImageUrl = publicUrlData.publicUrl
      }

      const authorName = currentUser ? currentUser.username : '匿名バルマ'
      const authorRank = currentUser ? currentUser.rank || '見習い' : '見習い'

      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert([
          {
            title,
            genre,
            description,
            servings,
            image_url: mainImageUrl,
            author_name: authorName,
            author_rank: authorRank,
            profile_id: currentUser ? currentUser.id : null,
          },
        ])
        .select()
        .single()

      if (recipeError) throw recipeError

      const recipeId = recipeData.id
      setCreatedRecipeId(recipeId)

      const validIngredients = ingredients.filter((ing) => ing.name.trim() !== '')
      if (validIngredients.length > 0) {
        const ingredientPayloads = validIngredients.map((ing) => ({
          recipe_id: recipeId,
          name: ing.name,
          affiliate_url: ing.affiliate_url,
        }))
        await supabase.from('recipe_ingredients').insert(ingredientPayloads)
      }

      const stepPayloads = []
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        if (!step.instruction.trim()) continue

        let stepImageUrl = ''
        if (step.imageFile) {
          const fileExt = step.imageFile.name.split('.').pop()
          const fileName = `${Date.now()}_step_${i + 1}.${fileExt}`
          const filePath = `public/steps/${fileName}`

          const { error: stepUploadError } = await supabase.storage
            .from('recipe-images')
            .upload(filePath, step.imageFile)

          if (!stepUploadError) {
            const { data: stepPublicUrl } = supabase.storage
              .from('recipe-images')
              .getPublicUrl(filePath)
            stepImageUrl = stepPublicUrl.publicUrl
          }
        }

        stepPayloads.push({
          recipe_id: recipeId,
          step_number: i + 1,
          instruction: step.instruction,
          image_url: stepImageUrl,
          image_comment: step.image_comment,
        })
      }

      if (stepPayloads.length > 0) {
        await supabase.from('recipe_steps').insert(stepPayloads)
      }

      // 感謝クラッカー＋Popupモーダル演出発動！
      triggerConfetti()
      setShowSuccessModal(true)
    } catch (err: any) {
      alert('投稿に失敗しました: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 relative">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
            ← レシピ一覧に戻る
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-amber-200 p-6 md:p-10">
          <h1 className="text-2xl font-black text-amber-900 mb-6 pb-3 border-b border-amber-100 flex items-center gap-2">
            <span>✨</span> 新しいカレーレシピを投稿
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-amber-800 border-l-4 border-amber-500 pl-2">
                1. 基本情報
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  レシピタイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：極上スパイスチキンカレー"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ジャンル</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="スパイスカレー">スパイスカレー</option>
                    <option value="欧風カレー">欧風カレー</option>
                    <option value="アジアン・タイ">アジアン・タイ</option>
                    <option value="スープカレー">スープカレー</option>
                    <option value="おうちキーマ">おうちキーマ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">何人前</label>
                  <input
                    type="text"
                    placeholder="例：2人前"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">完成写真（メイン画像）</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">レシピの説明・こだわり</label>
                <textarea
                  rows={3}
                  placeholder="隠し味の玉ねぎ炒めやスパイスの投入タイミングのコツなど..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex justify-between items-center border-l-4 border-amber-500 pl-2">
                <h2 className="text-sm font-bold text-amber-800">2. 材料・調味料</h2>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded-lg border border-amber-300 transition"
                >
                  ＋ 材料を追加
                </button>
              </div>

              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <input
                    type="text"
                    placeholder={`材料 ${idx + 1} (例：クミンパウダー 大さじ1)`}
                    value={ing.name}
                    onChange={(e) => {
                      const newIngs = [...ingredients]
                      newIngs[idx].name = e.target.value
                      setIngredients(newIngs)
                    }}
                    className="flex-1 border border-slate-300 rounded-lg p-2 text-xs bg-white"
                  />
                  <input
                    type="url"
                    placeholder="購入先URL (任意)"
                    value={ing.affiliate_url}
                    onChange={(e) => {
                      const newIngs = [...ingredients]
                      newIngs[idx].affiliate_url = e.target.value
                      setIngredients(newIngs)
                    }}
                    className="flex-1 border border-slate-300 rounded-lg p-2 text-xs bg-white"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-xs text-red-500 font-bold hover:underline px-1"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
            </section>

            <section className="space-y-4">
              <div className="flex justify-between items-center border-l-4 border-amber-500 pl-2">
                <h2 className="text-sm font-bold text-amber-800">3. 作り方手順</h2>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded-lg border border-amber-300 transition"
                >
                  ＋ 手順を追加
                </button>
              </div>

              {steps.map((step, idx) => (
                <div key={idx} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="bg-amber-600 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="text-xs text-red-500 font-bold hover:underline"
                      >
                        この手順を削除
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    placeholder={`手順 ${idx + 1} の内容を入力...`}
                    value={step.instruction}
                    onChange={(e) => {
                      const newSteps = [...steps]
                      newSteps[idx].instruction = e.target.value
                      setSteps(newSteps)
                    }}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white focus:outline-none"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const newSteps = [...steps]
                        newSteps[idx].imageFile = e.target.files?.[0] || null
                        setSteps(newSteps)
                      }}
                      className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-amber-100 file:text-amber-800"
                    />
                    <input
                      type="text"
                      placeholder="画像補足コメント (例: この色になるまで炒める)"
                      value={step.image_comment}
                      onChange={(e) => {
                        const newSteps = [...steps]
                        newSteps[idx].image_comment = e.target.value
                        setSteps(newSteps)
                      }}
                      className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                    />
                  </div>
                </div>
              ))}
            </section>

            {/* 投稿実行ボタン（ぷにぷにアニメーション付き） */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-base py-4 rounded-2xl shadow-lg transition disabled:opacity-50"
            >
              {submitting ? 'カレーをじっくり煮込み中...' : '🍛 レシピを投稿する！'}
            </motion.button>
          </form>
        </div>
      </div>

      {/* 🚀 NAMASTE! 投稿感謝アニメーションPopupモーダル */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50, rotate: -5 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-amber-400 space-y-4"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-6xl"
              >
                🙏
              </motion.div>

              <div>
                <h2 className="text-3xl font-black text-amber-800 tracking-wider">
                  NAMASTE!
                </h2>
                <p className="text-xs font-bold text-amber-600 mt-1">
                  素敵なおいしいレシピをありがとね！
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-2xl border border-amber-200">
                あなたのこだわりレシピがNAMASTEコミュニティに届きました！たくさんの「❤️」が届くのが楽しみですね。
              </p>

              <div className="pt-2">
                <button
                  onClick={() => {
                    router.push(`/recipes/${createdRecipeId}`)
                    router.refresh()
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-md text-sm transition"
                >
                  投稿したレシピを見る 🍛
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
