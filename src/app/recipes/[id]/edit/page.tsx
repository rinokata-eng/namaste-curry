'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('スパイスカレー')
  const [authorName, setAuthorName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const [ingredients, setIngredients] = useState<any[]>([])
  const [steps, setSteps] = useState<string[]>([])

  const [draggedIngIndex, setDraggedIngIndex] = useState<number | null>(null)
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null)

  useEffect(() => {
    async function loadRecipeData() {
      const { data: recipe, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !recipe) {
        alert('レシピデータの取得に失敗しました')
        router.push('/')
        return
      }

      setTitle(recipe.title || '')
      setGenre(recipe.genre || 'スパイスカレー')
      setAuthorName(recipe.author_name || '')
      setDescription(recipe.description || '')
      setImageUrl(recipe.image_url || '')

      const { data: ingData } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)

      if (ingData && ingData.length > 0) {
        setIngredients(
          ingData.map((ing) => {
            const match = ing.name.match(/^(.*)\s*\((.*)\)$/)
            return {
              name: match ? match[1] : ing.name,
              amount: match ? match[2] : '',
              amazonUrl: ing.affiliate_url?.includes('amazon') ? ing.affiliate_url : '',
              rakutenUrl: ing.affiliate_url?.includes('rakuten') ? ing.affiliate_url : '',
            }
          })
        )
      } else {
        setIngredients([{ name: '', amount: '', amazonUrl: '', rakutenUrl: '' }])
      }

      const { data: stepData } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', id)
        .order('step_number', { ascending: true })

      if (stepData && stepData.length > 0) {
        setSteps(stepData.map((s) => s.instruction))
      } else {
        setSteps([''])
      }

      setLoading(false)
    }

    loadRecipeData()
  }, [id, router])

  const addIngredient = () => setIngredients([...ingredients, { name: '', amount: '', amazonUrl: '', rakutenUrl: '' }])
  const removeIngredient = (idx: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== idx))
    }
  }
  const handleIngredientChange = (idx: number, field: string, value: string) => {
    const updated = [...ingredients]
    updated[idx][field] = value
    setIngredients(updated)
  }

  const handleIngDragStart = (idx: number) => setDraggedIngIndex(idx)
  const handleIngDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (draggedIngIndex === null || draggedIngIndex === idx) return
    const updated = [...ingredients]
    const [draggedItem] = updated.splice(draggedIngIndex, 1)
    updated.splice(idx, 0, draggedItem)
    setDraggedIngIndex(idx)
    setIngredients(updated)
  }

  const addStep = () => setSteps([...steps, ''])
  const removeStep = (idx: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== idx))
    }
  }
  const handleStepChange = (idx: number, value: string) => {
    const updated = [...steps]
    updated[idx] = value
    setSteps(updated)
  }

  const handleStepDragStart = (idx: number) => setDraggedStepIndex(idx)
  const handleStepDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (draggedStepIndex === null || draggedStepIndex === idx) return
    const updated = [...steps]
    const [draggedItem] = updated.splice(draggedStepIndex, 1)
    updated.splice(idx, 0, draggedItem)
    setDraggedStepIndex(idx)
    setSteps(updated)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('画像サイズが大きすぎます（最大2MBまで）。')
      e.target.value = ''
      return
    }
    setImageUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          title,
          genre,
          author_name: authorName,
          description,
          image_url: imageUrl || null,
        })
        .eq('id', id)

      if (recipeError) throw recipeError

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      await supabase.from('recipe_steps').delete().eq('recipe_id', id)

      const validIngredients = ingredients.filter((i) => i.name.trim() !== '')
      if (validIngredients.length > 0) {
        const ingredientsToInsert = validIngredients.map((ing) => ({
          recipe_id: id,
          name: `${ing.name} (${ing.amount || '適量'})`,
          affiliate_url: ing.amazonUrl?.trim() || ing.rakutenUrl?.trim() || null,
        }))
        await supabase.from('recipe_ingredients').insert(ingredientsToInsert)
      }

      const validSteps = steps.filter((s) => s.trim() !== '')
      if (validSteps.length > 0) {
        const stepsToInsert = validSteps.map((stepText, idx) => ({
          recipe_id: id,
          step_number: idx + 1,
          instruction: stepText.trim(),
        }))
        await supabase.from('recipe_steps').insert(stepsToInsert)
      }

      alert('レシピを更新しました！')
      router.push(`/recipes/${id}`)
      router.refresh()
    } catch (err: any) {
      alert('更新に失敗しました: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-amber-50 p-10 flex justify-center items-center text-slate-500 text-sm">
        レシピデータを読み込み中...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-amber-200 p-6 md:p-10">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-amber-100">
          <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
            <span>✏️</span> レシピを編集 (開発用)
          </h1>
          <Link href={`/recipes/${id}`} className="text-xs font-bold text-amber-700 hover:underline">
            キャンセルして戻る
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-md font-bold text-amber-800 border-l-4 border-amber-500 pl-2">1. レシピの基本情報</h2>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">レシピ名 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ジャンル *</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none"
                >
                  <option value="スパイスカレー">スパイスカレー</option>
                  <option value="欧風カレー">欧風カレー</option>
                  <option value="アジアン・タイ">アジアン・タイ</option>
                  <option value="スープカレー">スープカレー</option>
                  <option value="おうちキーマ">おうちキーマ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">バルマ名 (投稿者名) *</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">レシピの紹介・コツ</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">完成写真 (任意 / 2MB以内)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
              />
              {imageUrl && (
                <div className="mt-3 w-40 h-32 rounded-lg overflow-hidden border border-amber-200">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-md font-bold text-amber-800 border-l-4 border-amber-500 pl-2">2. 材料と購入用リンク</h2>
            {ingredients.map((ing, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleIngDragStart(idx)}
                onDragOver={(e) => handleIngDragOver(e, idx)}
                className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 space-y-2 relative"
              >
                <div className="flex gap-2 items-center">
                  <span className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-amber-700 px-1 font-bold text-lg select-none">
                    ⋮⋮
                  </span>
                  <input
                    type="text"
                    placeholder={`材料名 ${idx + 1}`}
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                    className="w-2/3 border border-slate-300 rounded-lg p-2 text-sm bg-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="分量"
                    value={ing.amount}
                    onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)}
                    className="w-1/3 border border-slate-300 rounded-lg p-2 text-sm bg-white focus:outline-none"
                  />
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="text-red-500 hover:text-red-700 font-bold px-2 text-sm shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pl-7">
                  <input
                    type="url"
                    placeholder="Amazon URL (任意)"
                    value={ing.amazonUrl}
                    onChange={(e) => handleIngredientChange(idx, 'amazonUrl', e.target.value)}
                    className="border border-slate-300 rounded-lg p-2 bg-white focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="楽天 URL (任意)"
                    value={ing.rakutenUrl}
                    onChange={(e) => handleIngredientChange(idx, 'rakutenUrl', e.target.value)}
                    className="border border-slate-300 rounded-lg p-2 bg-white focus:outline-none"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addIngredient}
              className="text-xs text-amber-700 font-bold hover:underline"
            >
              ＋ 材料欄を追加する
            </button>
          </section>

          <section className="space-y-4">
            <h2 className="text-md font-bold text-amber-800 border-l-4 border-amber-500 pl-2">3. 作り方ステップ</h2>
            {steps.map((step, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleStepDragStart(idx)}
                onDragOver={(e) => handleStepDragOver(e, idx)}
                className="flex gap-2 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200"
              >
                <span className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-amber-700 px-1 font-bold text-lg select-none mt-1">
                  ⋮⋮
                </span>
                <span className="bg-amber-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-2">
                  {idx + 1}
                </span>
                <textarea
                  rows={2}
                  value={step}
                  onChange={(e) => handleStepChange(idx, e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none bg-white"
                />
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="text-red-500 hover:text-red-700 font-bold px-2 text-sm shrink-0 mt-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="text-xs text-amber-700 font-bold hover:underline"
            >
              ＋ 手順を追加する
            </button>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl shadow-md transition disabled:opacity-50"
          >
            {submitting ? '更新保存中...' : '変更内容を保存する'}
          </button>
        </form>
      </div>
    </main>
  )
}
