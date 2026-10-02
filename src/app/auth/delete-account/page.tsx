'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DeleteAccountConfirmPage() {
  const router = useRouter()
  const [processing, setProcessing] = useState(true)
  const [message, setMessage] = useState('退会手続きを処理しています...')

  useEffect(() => {
    async function processAccountDeletion() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setMessage('有効な退会リンクではないか、すでに退会が完了しています。')
          setProcessing(false)
          return
        }

        // profiles の削除 (DBトリガーにより auth.users も自動削除される)
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id)

        if (profileError) throw profileError

        // ログアウト処理 & ローカルストレージ削除
        await supabase.auth.signOut()
        localStorage.removeItem('namaste_user')

        setMessage('退会手続きが完了いたしました。ご利用ありがとうございました。')
      } catch (err: any) {
        setMessage('退会処理中にエラーが発生しました: ' + err.message)
      } finally {
        setProcessing(false)
      }
    }

    processAccountDeletion()
  }, [])

  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-md border border-amber-200 text-center space-y-4">
        <div className="text-4xl">{processing ? '⏳' : '👋'}</div>
        <h1 className="text-xl font-bold text-amber-900">アカウント退会案内</h1>
        <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-4 rounded-2xl border border-amber-100">
          {message}
        </p>

        {!processing && (
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition"
            >
              トップページへ戻る
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
