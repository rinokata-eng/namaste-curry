'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
          ← トップへ戻る
        </Link>

        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-amber-200 space-y-6">
          <h1 className="text-2xl font-black text-amber-900 pb-3 border-b border-amber-100">
            🔒 プライバシーポリシー
          </h1>

          <div className="space-y-4 text-xs md:text-sm text-slate-700 leading-relaxed">
            <p>
              NAMASTE運営事務局（以下「当事務局」）は、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
            </p>

            <section className="space-y-2">
              <h2 className="font-bold text-amber-900 text-sm md:text-base border-l-4 border-amber-500 pl-2">
                1. 取得する個人情報
              </h2>
              <p>
                本サービスでは、新規会員登録およびログイン時に**メールアドレス**を取得いたします。また、サービス利用履歴やアクセスログを適切に管理する目的で収集する場合があります。
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-amber-900 text-sm md:text-base border-l-4 border-amber-500 pl-2">
                2. 利用目的
              </h2>
              <p>
                取得したメールアドレスおよび個人情報は、以下の目的で利用します：<br />
                ・ユーザー認証（メールアドレス確認・ログイン機能）のため<br />
                ・アカウント管理および本人確認のため<br />
                ・重要なお知らせやお問い合わせへの回答のため<br />
                ・利用規約に違反する行為の防止のため
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-amber-900 text-sm md:text-base border-l-4 border-amber-500 pl-2">
                3. 個人情報の第三者提供
              </h2>
              <p>
                当事務局は、法令に基づく場合を除き、ユーザーの同意を得ることなく第三者に個人情報を提供することはありません。
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-amber-900 text-sm md:text-base border-l-4 border-amber-500 pl-2">
                4. 安全管理措置
              </h2>
              <p>
                当事務局は、個人情報の漏洩、紛失、改ざんを防止するため、適切かつ厳重なセキュリティ対策を講じます。
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-amber-900 text-sm md:text-base border-l-4 border-amber-500 pl-2">
                5. お問い合わせ窓口
              </h2>
              <p>
                本ポリシーに関するお問い合わせは、サイト内「お問い合わせフォーム」よりお願いいたします。<br />
                運営主体：NAMASTE 運営事務局
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
