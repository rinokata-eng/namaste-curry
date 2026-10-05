'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const FEATURE_TYPES = [
  { id: '時短レシピ', label: '⏱ 時短レシピ' },
  { id: '市販のルー派', label: '🍛 市販のルー派' },
  { id: '決め手は隠し味', label: '✨ 決め手は隠し味' },
  { id: 'こだわりのスパイス調合', label: '🌿 こだわりのスパイス調合' },
]

export default function NewRecipePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('スパイスカレー')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('2人分')
  
  const [selectedFeatureTypes, setSelectedFeatureTypes] = useState<string[]>([])

  const [ingredients, setIngredients] = useState([
    { name: '', amount: '', amazon_url: '', rakuten_url: '', is_featured: false }
  ])

  const [steps, setSteps] = useState([
    { instruction: '', is_featured: true, imageFile: null as File | null, imagePreview: '' },
    { instruction: '', is_featured: false, imageFile: null as File | null, imagePreview: '' }
  ])

  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState<string>('')

  const [draggedIngIdx, setDraggedIngIdx] = useState<number | null>(null)
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    if (stored) {
      setCurrentUser(JSON.parse(stored))
    } else {
      alert('レシピを投稿するにはログインが必要です。')
      router.push('/login')
    }
  }, [router])

  const handleToggleFeature = (id: string) => {
    if (selectedFeatureTypes.includes(id)) {
      setSelectedFeatureTypes(selectedFeatureTypes.filter(f => f !== id))
    } else {
      if (selectedFeatureTypes.length >= 2) {
        alert('こだわりポイントは最大2つまで選択可能です 👳‍♂️')
        return
      }
      setSelectedFeatureTypes([...selectedFeatureTypes, id])

      if (id === '市販のルー派' || id === '決め手は隠し味') {
        setIngredients(prev => [
          { name: id === '市販のルー派' ? '市販カレールー (黄金配合)' : '決め手の隠し味', amount: '', amazon_url: '', rakuten_url: '', is_featured: true },
          ...prev
        ])
      }
    }
  }

  const validateUrl = (url: string, domain: 'amazon' | 'rakuten') => {
    if (!url.trim()) return true
    try {
      const parsed = new URL(url)
      if (domain === 'amazon' && (parsed.hostname.includes('amazon.co.jp') || parsed.hostname.includes('amazon.com') || parsed.hostname.includes('amzn.to'))) return true
      if (domain === 'rakuten' && (parsed.hostname.includes('rakuten.co.jp') || parsed.hostname.includes('rakuten.com') || parsed.hostname.includes('a.r10.to'))) return true
    } catch {
      return false
    }
    return false
  }

  const handleIngDragStart = (index: number) => setDraggedIngIdx(index)
  const handleIngDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIngIdx === null || draggedIngIdx === index) return
    const newArr = [...ingredients]
    const item = newArr.splice(draggedIngIdx, 1)[0]
    newArr.splice(index, 0, item)
    setDraggedIngIdx(index)
    setIngredients(newArr)
  }

  const handleStepDragStart = (index: number) => setDraggedStepIdx(index)
  const handleStepDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedStepIdx === null || draggedStepIdx === index) return
    const newArr = [...steps]
    const item = newArr.splice(draggedStepIdx, 1)[0]
    newArr.splice(index, 0, item)
    setDraggedStepIdx(index)
    setSteps(newArr)
  }

  const handleAddIngredient = (isFeatured = false) => {
    setIngredients([...ingredients, { name: '', amount: '', amazon_url: '', rakuten_url: '', is_featured: isFeatured }])
  }

  const handleAddStep = (isFeatured = false) => {
    setSteps([...steps, { instruction: '', is_featured: isFeatured, imageFile: null, imagePreview: '' }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return alert('タイトルを入力してください。')
    if (!currentUser) return

    for (const ing of ingredients) {
      if (ing.amazon_url && !validateUrl(ing.amazon_url, 'amazon')) {
        alert(`「${ing.name || '材料'}」のAmazon URLが不正です。`)
        return
      }
      if (ing.rakuten_url && !validateUrl(ing.rakuten_url, 'rakuten')) {
        alert(`「${ing.name || '材料'}」の楽天 URLが不正です。`)
        return
      }
    }

    setLoading(true)

    try {
      // 1. メイン画像のアップロード
      let mainImageUrl = ''
      if (mainImageFile) {
        const fileExt = mainImageFile.name.split('.').pop()
        const fileName = `main_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `recipes/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(filePath, mainImageFile)

        if (!uploadError) {
          const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath)
          mainImageUrl = data.publicUrl
        } else {
          console.error('メイン画像アップロード失敗:', uploadError)
        }
      }

      const combinedFeatureType = selectedFeatureTypes.join(',')

      // 2. レシピ本体の作成
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert([{
          title,
          genre,
          description,
          servings,
          image_url: mainImageUrl || null,
          profile_id: currentUser.id,
          author_name: currentUser.username || '名無しバルマ',
          feature_type: combinedFeatureType || null,
        }])
        .select()
        .single()

      if (recipeError) throw recipeError
      const recipeId = recipeData.id

      // 3. 材料保存
      const validIngredients = ingredients.filter(i => i.name.trim())
      if (validIngredients.length > 0) {
        const ingPayload = validIngredients.map(i => ({
          recipe_id: recipeId,
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

      // 4. 手順および手順画像の保存
      const validSteps = steps.filter(s => s.instruction.trim() || s.imageFile)
      for (let idx = 0; idx < validSteps.length; idx++) {
        const st = validSteps[idx]
        let stepImageUrl = ''

        if (st.imageFile) {
          const fileExt = st.imageFile.name.split('.').pop()
          const fileName = `step_${recipeId}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `recipes/${fileName}`

          const { error: stepImgErr } = await supabase.storage
            .from('recipe-images')
            .upload(filePath, st.imageFile)

          if (!stepImgErr) {
            const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath)
            stepImageUrl = data.publicUrl
          } else {
            console.error(`手順${idx + 1}の画像アップロード失敗:`, stepImgErr)
          }
        }

        const stepPayload = {
          recipe_id: recipeId,
          step_number: idx + 1,
          instruction: st.instruction,
          step_description: st.instruction,
          is_featured: st.is_featured || false,
          image_url: stepImageUrl || null,
        }

        await supabase.from('recipe_steps').insert([stepPayload])
      }

      alert('カレーレシピを投稿しました！👳‍♂️')
      router.push(`/recipes/${recipeId}`)
    } catch (err: any) {
      alert('投稿エラー: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-amber-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="text-xs font-bold text-amber-700 hover:underline">
          ← トップへ戻る
        </Link>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-amber-200 space-y-6">
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b border-amber-100 pb-4">
            <span>🍛</span> カレーレシピを投稿する
          </h1>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">レシピタイトル *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例：極上の玉ねぎチキンスパイスカレー"
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
                  placeholder="例：2〜3人分"
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
              placeholder="このカレーの魅力やこだわりを教えてください！"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* 完成写真選択＆プレビュー */}
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
            {mainImagePreview && (
              <div className="mt-3 relative w-full h-52 rounded-2xl overflow-hidden bg-slate-100 border border-amber-200 group">
                <img src={mainImagePreview} alt="完成写真プレビュー" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setMainImageFile(null)
                    setMainImagePreview('')
                  }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-xs transition cursor-pointer"
                >
                  ✕ 削除
                </button>
              </div>
            )}
          </div>

          {/* 材料 */}
          <div className="space-y-3 border-t border-amber-100 pt-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-800">
                🛒 材料 <span className="text-[10px] text-slate-400 font-normal">（⠿ をドラッグして順序入れ替え）</span>
              </label>
              <button
                type="button"
                onClick={() => handleAddIngredient(true)}
                className="text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 transition cursor-pointer"
              >
                ＋ 🔥 強調材料を追加
              </button>
            </div>

            <div className="space-y-2.5">
              {ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleIngDragStart(idx)}
                  onDragOver={e => handleIngDragOver(e, idx)}
                  className={`p-3 rounded-2xl border transition space-y-2 cursor-move ${
                    ing.is_featured
                      ? 'bg-amber-100/90 border-amber-400 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold select-none cursor-grab">⠿</span>
                    {ing.is_featured && (
                      <span className="bg-amber-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shrink-0">
                        🔥 強調
                      </span>
                    )}
                    <input
                      type="text"
                      placeholder="材料名 (例: カレールー、隠し味チョコ)"
                      value={ing.name}
                      onChange={e => {
                        const newArr = [...ingredients]
                        newArr[idx].name = e.target.value
                        setIngredients(newArr)
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="分量 (例: 1/2箱)"
                      value={ing.amount}
                      onChange={e => {
                        const newArr = [...ingredients]
                        newArr[idx].amount = e.target.value
                        setIngredients(newArr)
                      }}
                      className="w-24 bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-amber-900 shrink-0">🛒 Amazon:</span>
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
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleAddIngredient(false)}
              className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              ＋ 通常の材料を追加
            </button>
          </div>

          {/* 手順 */}
          <div className="space-y-3 border-t border-amber-100 pt-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-800">
                👨‍🍳 作り方手順 <span className="text-[10px] text-slate-400 font-normal">（⠿ をドラッグして順序入れ替え）</span>
              </label>
              <button
                type="button"
                onClick={() => handleAddStep(true)}
                className="text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 px-2.5 py-1 rounded-lg transition cursor-pointer shadow-xs"
              >
                ＋ 🔥 秘伝・強調手順を追加
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((st, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleStepDragStart(idx)}
                  onDragOver={e => handleStepDragOver(e, idx)}
                  className={`p-3.5 rounded-2xl border space-y-2 cursor-move ${
                    st.is_featured
                      ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-400 shadow-sm'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold select-none cursor-grab">⠿</span>
                      <span className="font-bold text-amber-900 text-xs">手順 {idx + 1}</span>
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
                    className={`w-full border rounded-xl p-2.5 text-xs text-slate-800 outline-none resize-none ${
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
                    {st.imagePreview && (
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img src={st.imagePreview} alt="Step preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const newArr = [...steps]
                            newArr[idx].imageFile = null
                            newArr[idx].imagePreview = ''
                            setSteps(newArr)
                          }}
                          className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleAddStep(false)}
              className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              ＋ 通常の手順を追加
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? '送信中...' : 'カレーレシピを投稿する 👳‍♂️'}
          </button>
        </form>
      </div>
    </main>
  )
}
