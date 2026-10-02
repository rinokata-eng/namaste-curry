'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-amber-50 text-slate-800 p-4 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-sm font-bold text-amber-700 hover:text-amber-800">
          ← トップへ戻る
        </Link>

        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-amber-200 space-y-8">
          <div className="border-b border-amber-200 pb-4 text-center sm:text-left">
            <h1 className="text-2xl font-black text-amber-900">📜 利用規約</h1>
            <p className="text-xs text-amber-700 mt-1">
              NAMASTE（以下「本サービス」）をご利用いただく際の規約です。
            </p>
          </div>

          <div className="space-y-6 text-xs text-slate-700 leading-relaxed">
            {/* 第1条 */}
            <section className="space-y-2">
              <h2 className="font-bold text-sm text-slate-900 border-l-4 border-amber-500 pl-2">
                第1条（適用）
              </h2>
              <p>
                本規約は、ユーザーと本サービス運営者（以下「運営」）との間の本サービスの利用に関わる一切の関係に適用されます。ユーザーは、本サービスを利用することにより本規約に同意したものとみなされます。
              </p>
            </section>

            {/* 第2条: パスワード管理責任 */}
            <section className="space-y-2">
              <h2 className="font-bold text-sm text-slate-900 border-l-4 border-amber-500 pl-2">
                第2条（アカウントおよびパスワードの管理責任）
              </h2>
              <p>
                1. ユーザーは、自己の責任において、本サービスの登録メールアドレスおよびパスワードを厳重に管理するものとします。
              </p>
              <p>
                2. ユーザーは、いかなる場合であっても、パスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。
              </p>
              <p className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 font-semibold">
                3. セキュリティ保護および個人情報保護の観点から、運営側では個別のパスワードの開示、調査、補填、変更依頼（「パスワードを忘れたので教えてほしい」「手動でリセットしてほしい」等のお問い合わせ）には一切対応いたしかねます。パスワードのお忘れや変更に関しては、本サービス上のパスワード再設定機能を用いてユーザーご自身で手続きを行ってください。
              </p>
            </section>

            {/* 第3条: 投稿コンテンツと削除措置 */}
            <section className="space-y-2">
              <h2 className="font-bold text-sm text-slate-900 border-l-4 border-amber-500 pl-2">
                第3条（投稿コンテンツの権利および不適切投稿の削除）
              </h2>
              <p>
                1. ユーザーが本サービス上に投稿したレシピ、文章、画像等のコンテンツ（以下「投稿コンテンツ」）の著作権は、投稿したユーザー本人に帰属します。
              </p>
              <p>
                2. ユーザーは投稿コンテンツに関して、運営に対し、本サービスの提供、改善、プロモーション、広報活動の目的において、無償、無期限かつ非独占的に利用（表示、複製、一部改変・翻案等を含む）する権利を許諾するものとします。
              </p>
              <p>
                3. ユーザーは、レシピと無関係な意味不明な投稿、不快・猥褻・暴力的な画像やテキスト、他者の著作権・肖像権等を侵害する不適切なコンテンツを投稿してはなりません。
              </p>
              <p className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-950 font-bold">
                4. 運営は、投稿コンテンツが前項または本規約に違反する、あるいは本サービスの運営上不適切であると判断した場合、事前の通知や理由の開示を行うことなく、当該投稿コンテンツの全部または一部を即座に削除・非表示化できるものとします。
              </p>
            </section>

            {/* 第4条: 禁止事項および盗作・パクリ禁止 */}
            <section className="space-y-2">
              <h2 className="font-bold text-sm text-slate-900 border-l-4 border-amber-500 pl-2">
                第4条（禁止事項および利用停止・アカウント強制削除）
              </h2>
              <p>1. ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
                <li>法令または公序良俗に違反する行為</li>
                <li>他のユーザーのオリジナルレシピ、文章、画像等を意図的かつ過度に模倣・無断転載・盗用する行為</li>
                <li>不適切・わいせつ・不快な画像や意味不明なスパムテキストの投稿行為</li>
                <li>他者への誹謗中傷、営業・勧誘・嫌がらせ行為</li>
                <li>不正アクセス、不当なリクエスト送信等、サーバーやシステムに著しい負荷をかける行為</li>
                <li>他者のなりすまし行為、または虚偽の情報を提供する行為</li>
              </ul>
              <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 text-red-950 space-y-2 mt-2">
                <p className="font-bold">
                  2. アカウント強制削除（利用停止）および再登録拒否について
                </p>
                <p className="text-[11px] leading-relaxed">
                  ユーザーが禁止事項に違反した場合、または運営が本サービスの利用継続を不適切と判断した場合、運営は事前予告なく**当該ユーザーのアカウントを強制削除（永久利用停止）**できるものとします。また、強制削除措置を受けたユーザーによる**本サービスへの再登録は一切禁止（再登録拒否）**といたします。
                </p>
              </div>
            </section>

            {/* 第5条: 免責事項・ユーザー間トラブルの不関与 */}
            <section className="space-y-2">
              <h2 className="font-bold text-sm text-slate-900 border-l-4 border-amber-500 pl-2">
                第5条（免責事項およびユーザー間トラブルの不関与）
              </h2>
              <p>
                1. 運営は、本サービスに掲載されるレシピや情報の正確性、完全性、安全性についていかなる保証も行いません。調理時における事故、アレルギー、損害等について一切の責任を負いません。
              </p>
              <p className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 font-semibold">
                2. 本サービスに関連してユーザー同士またはユーザーと第三者との間で生じたトラブル、紛争、権利侵害（レシピやコンテンツの模倣・盗作問題、誹謗中傷等を含む）について、運営は一切の関与および仲裁を行わず、いかなる責任も負いません。当事者間で直接解決するものとします。
              </p>
              <p>
                3. 運営による投稿コンテンツの削除やアカウント強制削除措置に伴いユーザーに生じた損害について、運営は一切の責任を負いません。
              </p>
            </section>

            {/* 第6条: 規約の変更 */}
            <section className="space-y-2">
              <h2 className="font-bold text-sm text-slate-900 border-l-4 border-amber-500 pl-2">
                第6条（利用規約の変更）
              </h2>
              <p>
                運営は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の利用規約は、本サービス上に表示した時点より効力を生じるものとします。
              </p>
            </section>
          </div>

          <div className="pt-4 border-t border-amber-100 text-[11px] text-slate-400 text-right">
            最終改定日: 2026年10月2日
          </div>
        </div>
      </div>
    </main>
  )
}
