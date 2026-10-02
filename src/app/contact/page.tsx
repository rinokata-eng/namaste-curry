'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('サービスに関するお問い合わせ')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('namaste_user')
    if (!stored) {
      alert('お問い合わせを送信するにはバルマ（会員）登録またはログインが必要です。')
      router.push('/login')
      return
    }

    const user = JSON.parse(stored)
    setCurrentUser(user)
    setUsername(user.username || '')
    setEmail(user.email || '')
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // 送信シミュレーション
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 800)
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-amber-50 p-10 flex justify-center items-center text-slate-500 text-xs">
        ログイン情報を確認中...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10">
      <div className="max-w-xl mx-auto space-y-6">
        <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
          ← トップへ戻る
        </Link>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-amber-200 space-y-6">
          <div className="border-b border-amber-200 pb-4 text-center sm:text-left">
            <h1 className="text-2xl font-black text-amber-900">📩 お問い合わせ</h1>
            <p className="text-xs text-amber-700 mt-1">
              NAMASTE事務局へのお問い合わせ・不具合報告はこちらからお送りください。
            </p>
          </div>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3">
              <div className="text-4xl">👳‍♂️✨</div>
              <h3 className="font-bold text-sm text-emerald-900">お問い合わせを受け付けました！</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                メッセージをお送りいただきありがとうございます。<br />内容を確認のうえ、ご登録メールアドレス宛にご連絡いたします。
              </p>
              <div className="pt-2">
                <Link href="/" className="inline-block bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl">
                  トップページへ戻る
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">バルマ名 (ユーザー名)</label>
                <input
                  type="text"
                  disabled
                  value={username}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-100 text-slate-600 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-100 text-slate-600 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">お問い合わせ種別</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="サービスに関するお問い合わせ">サービスに関するお問い合わせ</option>
                  <option value="不適切な投稿・権利侵害の通報">不適切な投稿・権利侵害の通報</option>
                  <option value="不具合・バグの報告">不具合・バグの報告</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">お問い合わせ内容</label>
                <textarea
                  required
                  rows={5}
                  placeholder="詳細な内容をご記入ください"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-2xl shadow-md transition text-sm disabled:opacity-50 active:scale-95"
              >
                {submitting ? '送信中...' : '送信する 🚀'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
