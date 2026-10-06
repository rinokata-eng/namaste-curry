'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FEATURE_TYPES = [
  { id: '時短レシピ', label: '⏱ 時短レシピ' },
  { id: '市販のルー派', label: '🍛 市販のルー派' },
  { id: '決め手は隠し味', label: '✨ 決め手は隠し味' },
  { id: 'こだわりのスパイス調合', label: '🌿 こだわりのスパイス調合' },
]

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('スパイスカレー')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('2人分')
  
  const [selectedFeatureTypes, setSelectedFeatureTypes] = useState<string[]>([])

  const [ingredients, setIngredients] = useState<any[]>([])
  const [steps, setSteps] = useState<any[]>([])

  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState<string>('')

  const [animatingId, setAnimatingId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    let user = null
    if (stored) {
      user = JSON.parse(stored)
      setCurrentUser(user)
    } else {
      alert('レシピを編集するにはログインが必要です。')
      router.push('/login')
      return
    }

    async function loadRecipeData() {
      const { data: recipeData, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !recipeData) {
        alert('レシピが見つかりませんでした。')
        router.push('/')
        return
      }

      if (user && recipeData.profile_id && recipeData.profile_id !== user.id && recipeData.author_name !== user.username) {
        alert('ご自身の投稿レシピのみ編集可能です。')
        router.push(`/recipes/${id}`)
        return
      }

      setTitle(recipeData.title || '')
      setGenre(recipeData.genre || 'スパイスカレー')
      setDescription(recipeData.description || '')
      setServings(recipeData.servings || '2人分')
      setExistingImageUrl(recipeData.image_url || null)

      if (recipeData.feature_type) {
        setSelectedFeatureTypes(recipeData.feature_type.split(','))
      }

      const { data: ingData } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)

      if (ingData && ingData.length > 0) {
        setIngredients(
          ingData.map((ing, idx) => ({
            id: ing.id || `ing-${idx}-${Date.now()}`,
            name: ing.name || ing.ingredient_name || '',
            amount: ing.amount || ing.quantity || '',
            amazon_url: ing.amazon_url || (ing.link_url?.includes('amazon') ? ing.link_url : ''),
            rakuten_url: ing.rakuten_url || (ing.link_url?.includes('rakuten') ? ing.link_url : ''),
            is_featured: ing.is_featured || false,
          }))
        )
      } else {
        setIngredients([
          { id: `ing-1-${Date.now()}`, name: '', amount: '', amazon_url: '', rakuten_url: '', is_featured: false }
        ])
      }

      const { data: stepData } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', id)
        .order('step_number', { ascending: true })

      if (stepData && stepData.length > 0) {
        setSteps(
          stepData.map((st, idx) => ({
            id: st.id || `step-${idx}-${Date.now()}`,
            instruction: st.instruction || st.step_description || '',
            is_featured: st.is_featured || false,
            existingImageUrl: st.image_url || null,
            imageFile: null,
            imagePreview: st.image_url || '',
          }))
        )
      } else {
        setSteps([
          { id: `step-1-${Date.now()}`, instruction: '', is_featured: false, existingImageUrl: null, imageFile: null, imagePreview: '' }
        ])
      }

      setLoading(false)
    }

    loadRecipeData()
  }, [id, router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault()
    }
  }

  const handleToggleFeature = (featId: string) => {
    if (selectedFeatureTypes.includes(featId)) {
      setSelectedFeatureTypes(selectedFeatureTypes.filter(f => f !== featId))
    } else {
      if (selectedFeatureTypes.length >= 2) {
        alert('こだわりポイントは最大2つまで選択可能です 👳‍♂️')
        return
      }
      setSelectedFeatureTypes([...selectedFeatureTypes, featId])
    }
  }

  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= ingredients.length) return

    const movingItem = ingredients[index]
    setAnimatingId(movingItem.id)

    const newArr = [...ingredients]
    const temp = newArr[index]
    newArr[index] = newArr[targetIdx]
    newArr[targetIdx] = temp
    setIngredients(newArr)

    setTimeout(() => {
      setAnimatingId(null)
    }, 200)
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= steps.length) return

    const movingItem = steps[index]
    setAnimatingId(movingItem.id)

    const newArr = [...steps]
    const temp = newArr[index]
    newArr[index] = newArr[targetIdx]
    newArr[targetIdx] = temp
    setSteps(newArr)

    setTimeout(() => {
      setAnimatingId(null)
    }, 200)
  }

  const handleAddIngredient = (isFeatured = false) => {
    setIngredients([...ingredients, { id: `ing-${Date.now()}`, name: '', amount: '', amazon_url: '', rakuten_url: '', is_featured: isFeatured }])
  }

  const handleAddStep = (isFeatured = false) => {
    setSteps([...steps, { id: `step-${Date.now()}`, instruction: '', is_featured: isFeatured, existingImageUrl: null, imageFile: null, imagePreview: '' }])
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return alert('タイトルを入力してください。')

    setSubmitting(true)

    try {
      let finalMainImageUrl = existingImageUrl

      if (mainImageFile) {
        const fileExt = mainImageFile.name.split('.').pop()
        const fileName = `main_${id}_${Date.now()}.${fileExt}`
        const filePath = `recipes/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(filePath, mainImageFile)

        if (!uploadError) {
          const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath)
          finalMainImageUrl = data.publicUrl
        }
      }

      const combinedFeatureType = selectedFeatureTypes.join(',')

      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          title,
          genre,
          description,
          servings,
          image_url: finalMainImageUrl,
          feature_type: combinedFeatureType || null,
        })
        .eq('id', id)

      if (updateError) throw updateError

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      await supabase.from('recipe_steps').delete().eq('recipe_id', id)

      const validIngredients = ingredients.filter(i => i.name.trim())
      if (validIngredients.length > 0) {
        const ingPayload = validIngredients.map(i => ({
          recipe_id: id,
          name: i.name,
          ingredient_name: i.name,
          amount: i.amount,
          quantity: i.amount,
          link_url: i.amazon_url || i.rakuten_url || null,
          amazon_url: i.amazon_url || null,
          rakuten_url: i.rakuten_url || null,
          is_featured: i.is_featured || false,
        }))
        await supabase.from('recipe_ingredients').insert(ingPayload)
      }

      const validSteps = steps.filter(s => s.instruction.trim() || s.imageFile || s.existingImageUrl)
      for (let idx = 0; idx < validSteps.length; idx++) {
        const st = validSteps[idx]
        let stepImageUrl = st.existingImageUrl || ''

        if (st.imageFile) {
          const fileExt = st.imageFile.name.split('.').pop()
          const fileName = `step_${id}_${idx}_${Date.now()}.${fileExt}`
          const filePath = `recipes/${fileName}`

          const { error: stepImgErr } = await supabase.storage
            .from('recipe-images')
            .upload(filePath, st.imageFile)

          if (!stepImgErr) {
            const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath)
            stepImageUrl = data.publicUrl
          }
        }

        const stepPayload = {
          recipe_id: id,
          step_number: idx + 1,
          instruction: st.instruction,
          step_description: st.instruction,
          is_featured: st.is_featured || false,
          image_url: stepImageUrl || null,
        }

        await supabase.from('recipe_steps').insert([stepPayload])
      }

      alert('レシピを更新しました！👳‍♂️')
      router.push(`/recipes/${id}`)
    } catch (err: any) {
      alert('更新エラー: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('本当にこのレシピを削除しますか？\nこの操作は取り消せません。')) return

    setDeleting(true)
    try {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      await supabase.from('recipe_steps').delete().eq('recipe_id', id)
      await supabase.from('recipe_likes').delete().eq('recipe_id', id)
      await supabase.from('recipe_bookmarks').delete().eq('recipe_id', id)
      await supabase.from('recipe_evaluations').delete().eq('recipe_id', id)

      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error

      alert('レシピを削除しました。')
      router.push('/')
    } catch (err: any) {
      alert('削除エラー: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-amber-50 p-10 text-center text-slate-500 text-sm">読み込み中...</main>
  }

  return (
    <main className="min-h-screen bg-amber-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href={`/recipes/${id}`} className="text-xs font-bold text-amber-700 hover:underline">
          ← レシピ詳細に戻る
        </Link>

        <form
          onSubmit={handleSave}
          onKeyDown={handleKeyDown}
          className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-amber-200 space-y-6"
        >
          <div className="flex justify-between items-center border-b border-amber-100 pb-4">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              ✏️ レシピを編集する
            </h1>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition cursor-pointer"
            >
              {deleting ? '削除中...' : '🗑️ レシピを削除'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">レシピタイトル *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ジャンル</label>
                <select
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                >
                  <option value="スパイスカレー">スパイスカレー</option>
                  <option value="お家カレー（ルウ）">お家カレー（ルウ）</option>
                  <option value="欧風カレー">欧風カレー</option>
                  <option value="キーマカレー">キーマカレー</option>
                  <option value="スープカレー">スープカレー</option>
                  <option value="エスニック・その他">エスニック・その他</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">分量</label>
                <input
                  type="text"
                  value={servings}
                  onChange={e => setServings(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
            <label className="block text-xs font-black text-amber-950">
              🔥 このカレーのこだわり・特化ポイント <span className="text-[10px] text-amber-800 font-normal">（最大2つ選択可能）</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FEATURE_TYPES.map(feat => {
                const isSelected = selectedFeatureTypes.includes(feat.id)
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => handleToggleFeature(feat.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-md scale-105'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-100'
                    }`}
                  >
                    {feat.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">レシピの説明・一言</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">完成写真</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) {
                  setMainImageFile(f)
                  setMainImagePreview(URL.createObjectURL(f))
                }
              }}
              className="text-xs text-slate-500"
            />
            {(mainImagePreview || existingImageUrl) && (
              <div className="mt-3 relative w-full h-52 rounded-2xl overflow-hidden bg-slate-100 border border-amber-200">
                <img src={mainImagePreview || existingImageUrl || ''} alt="完成写真プレビュー" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setMainImageFile(null)
                    setMainImagePreview('')
                    setExistingImageUrl(null)
                  }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-xs transition cursor-pointer"
                >
                  ✕ 削除
                </button>
              </div>
            )}
          </div>

          {/* 🛒 材料 */}
          <div className="space-y-3 border-t border-amber-100 pt-4">
            <label className="block text-xs font-bold text-slate-800">
              🛒 材料 <span className="text-[10px] text-slate-400 font-normal">（▲▼ボタンでスライド順序変更）</span>
            </label>

            <div className="space-y-2.5">
              {ingredients.map((ing, idx) => {
                const isAnimating = animatingId === ing.id
                return (
                  <div
                    key={ing.id}
                    className={`p-3 rounded-2xl border transition-all duration-200 ease-in-out transform ${
                      isAnimating ? 'scale-102 bg-amber-100 shadow-md z-10' : ''
                    } ${
                      ing.is_featured
                        ? 'bg-amber-100/90 border-amber-400 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveIngredient(idx, 'up')}
                          disabled={idx === 0}
                          className="w-7 h-7 flex items-center justify-center bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-lg disabled:opacity-20 transition-transform active:scale-95 shadow-xs cursor-pointer"
                          title="上へ移動"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveIngredient(idx, 'down')}
                          disabled={idx === ingredients.length - 1}
                          className="w-7 h-7 flex items-center justify-center bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-lg disabled:opacity-20 transition-transform active:scale-95 shadow-xs cursor-pointer"
                          title="下へ移動"
                        >
                          ▼
                        </button>
                      </div>

                      {ing.is_featured && (
                        <span className="bg-amber-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shrink-0">
                          🔥 強調
                        </span>
                      )}
                      <input
                        type="text"
                        placeholder="材料名 (例: ルウ、隠し味チョコ)"
                        value={ing.name}
                        onChange={e => {
                          const newArr = [...ingredients]
                          newArr[idx].name = e.target.value
                          setIngredients(newArr)
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="分量"
                        value={ing.amount}
                        onChange={e => {
                          const newArr = [...ingredients]
                          newArr[idx].amount = e.target.value
                          setIngredients(newArr)
                        }}
                        className="w-20 bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                      />
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 px-1 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9 pt-2 border-t border-slate-200/60 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-amber-950 shrink-0">🛒 Amazon:</span>
                        <input
                          type="url"
                          placeholder="https://www.amazon.co.jp/..."
                          value={ing.amazon_url}
                          onChange={e => {
                            const newArr = [...ingredients]
                            newArr[idx].amazon_url = e.target.value
                            setIngredients(newArr)
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] text-slate-700 outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-red-800 shrink-0">🛍️ 楽天:</span>
                        <input
                          type="url"
                          placeholder="https://www.rakuten.co.jp/..."
                          value={ing.rakuten_url}
                          onChange={e => {
                            const newArr = [...ingredients]
                            newArr[idx].rakuten_url = e.target.value
                            setIngredients(newArr)
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] text-slate-700 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 追加ボタンを並べて配置 */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleAddIngredient(false)}
                className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer"
              >
                ＋ 通常の材料を追加
              </button>
              <button
                type="button"
                onClick={() => handleAddIngredient(true)}
                className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-xl border border-amber-300 transition cursor-pointer shadow-xs"
              >
                ＋ 🔥 強調材料を追加
              </button>
            </div>
          </div>

          {/* 👨‍🍳 手順 */}
          <div className="space-y-3 border-t border-amber-100 pt-4">
            <label className="block text-xs font-bold text-slate-800">
              👨‍🍳 作り方手順 <span className="text-[10px] text-slate-400 font-normal">（▲▼ボタンでスライド順序変更）</span>
            </label>

            <div className="space-y-3">
              {steps.map((st, idx) => {
                const isAnimating = animatingId === st.id
                return (
                  <div
                    key={st.id}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 ease-in-out transform ${
                      isAnimating ? 'scale-102 bg-amber-100 shadow-md z-10' : ''
                    } ${
                      st.is_featured
                        ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-400 shadow-sm'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveStep(idx, 'up')}
                            disabled={idx === 0}
                            className="w-7 h-7 flex items-center justify-center bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-lg disabled:opacity-20 transition-transform active:scale-95 shadow-xs cursor-pointer"
                            title="上へ移動"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(idx, 'down')}
                            disabled={idx === steps.length - 1}
                            className="w-7 h-7 flex items-center justify-center bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs rounded-lg disabled:opacity-20 transition-transform active:scale-95 shadow-xs cursor-pointer"
                            title="下へ移動"
                          >
                            ▼
                          </button>
                        </div>
                        <span className="font-bold text-amber-900 text-xs ml-1">手順 {idx + 1}</span>
                        {st.is_featured && (
                          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] px-2 py-0.5 rounded-md shadow-xs">
                            🔥 秘伝強調手順
                          </span>
                        )}
                      </div>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      placeholder={st.is_featured ? "🔥 このカレーで一番こだわっている秘伝の手順を入力..." : "調理手順を入力..."}
                      value={st.instruction}
                      onChange={e => {
                        const newArr = [...steps]
                        newArr[idx].instruction = e.target.value
                        setSteps(newArr)
                      }}
                      className={`w-full border rounded-xl p-2.5 text-xs text-slate-800 outline-none resize-none mt-2 ${
                        st.is_featured ? 'bg-white border-amber-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    />

                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const newArr = [...steps]
                            newArr[idx].imageFile = file
                            newArr[idx].imagePreview = URL.createObjectURL(file)
                            setSteps(newArr)
                          }
                        }}
                        className="text-[11px] text-slate-500"
                      />
                      {(st.imagePreview || st.existingImageUrl) && (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                          <img src={st.imagePreview || st.existingImageUrl} alt="Step preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const newArr = [...steps]
                              newArr[idx].imageFile = null
                              newArr[idx].imagePreview = ''
                              newArr[idx].existingImageUrl = null
                              setSteps(newArr)
                            }}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 追加ボタンを並べて配置 */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleAddStep(false)}
                className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer"
              >
                ＋ 通常の手順を追加
              </button>
              <button
                type="button"
                onClick={() => handleAddStep(true)}
                className="text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
              >
                ＋ 🔥 秘伝・強調手順を追加
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? '保存中...' : '変更を保存する 👳‍♂️️'}
          </button>
        </form>
      </div>
    </main>
  )
}
