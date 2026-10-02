'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NewUserPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreed) {
      alert('利用規約およびプライバシーポリシーへの同意が必要です。')
      return
    }

    if (!email || !password || !username) {
      alert('必須項目をすべて入力してください。')
      return
    }

    setLoading(true)

    try {
      // 1. Supabase Authで新規ユーザー作成 (確認メールが自動送信される)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (authData.user) {
        // 2. profilesテーブルに仮プロフィール情報を挿入
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            username: username,
            bio: bio,
            rank: '見習い',
          },
        ])

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }

      // メール送信完了画面へ切り替え
      setEmailSent(true)
    } catch (err: any) {
      alert('登録に失敗しました: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
          ← トップへ戻る
        </Link>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-amber-200 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-amber-900">👳‍♂️ 新しいバルマを登録</h1>
            <p className="text-xs text-amber-700">秘伝のカレーレシピを共有するコミュニティへ参加しよう</p>
          </div>

          {emailSent ? (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center space-y-4">
              <div className="text-4xl">✉️</div>
              <h2 className="font-bold text-amber-900 text-base">確認メールを送信しました！</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>{email}</strong> 宛に確認用メールをお送りしました。<br />
                メール本文内の認証リンクをクリックしてアカウント登録を完了してください。
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition"
                >
                  メール確認後、ログイン画面へ 🔑
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  バルマ名 (表示名) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：スパイス太郎"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="例：namaste@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="6文字以上のパスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">自己紹介 (任意)</label>
                <textarea
                  rows={2}
                  placeholder="好きなスパイスやよく作るカレーについて..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* 規約・プラポリへの同意チェック */}
              <div className="pt-2 bg-amber-50/60 p-3 rounded-xl border border-amber-100 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="agree" className="text-xs text-slate-600 leading-snug cursor-pointer select-none">
                  <Link href="/terms" target="_blank" className="text-amber-800 font-bold underline hover:text-amber-900">
                    利用規約
                  </Link>
                  および
                  <Link href="/privacy" target="_blank" className="text-amber-800 font-bold underline hover:text-amber-900">
                    プライバシーポリシー
                  </Link>
                  に同意します。
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !agreed}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-2xl shadow-md transition text-sm disabled:opacity-50 mt-2"
              >
                {loading ? '送信中...' : '確認メールを送信して登録'}
              </button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              すでにアカウントをお持ちですか？{' '}
              <Link href="/login" className="text-amber-700 font-bold hover:underline">
                ログインはこちら
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
