'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const PLATFORMS = ['Instagram', 'YouTube', 'Facebook', 'TikTok', '小紅書', 'Podcast', '其他']

const schema = z.object({
  name:        z.string().min(1, '請填寫姓名'),
  platform:    z.string().min(1, '請選擇平台'),
  accountLink: z.string().min(1, '請填寫帳號連結'),
  followers:   z.string().optional().default(''),
  email:       z.string().email('請填寫有效的 Email').min(1, '請填寫 Email'),
  phone:       z.string().optional().default(''),
  address:     z.string().min(1, '請填寫收貨地址'),
  product:     z.string().optional().default(''),
  notes:       z.string().optional().default(''),
})

type FormData = z.infer<typeof schema>

export default function PrInviteForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { platform: '' },
  })

  const onSubmit = async (values: FormData) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/public/pr-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('送出失敗')
      setSubmitted(true)
    } catch {
      setError('送出失敗，請稍後再試或聯繫我們')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">感謝你的填寫！</h2>
          <p className="text-gray-500 text-sm">我們已收到你的資料，公關團隊將會與你聯絡 🎉</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">淨淨 CleanClean 公關邀約</h1>
          <p className="text-gray-500 text-sm mt-2">請填寫以下資料，讓我們更了解你 ✨</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 space-y-5">
          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              姓名 / 暱稱 <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('name')}
              placeholder="你的真實姓名或常用暱稱"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* 平台 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              主要社群平台 <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue('platform', p)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    watch('platform') === p
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-rose-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {errors.platform && <p className="text-xs text-rose-500 mt-1">{errors.platform.message}</p>}
          </div>

          {/* 帳號連結 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              帳號連結 <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('accountLink')}
              placeholder="https://www.instagram.com/your_account"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
            />
            {errors.accountLink && <p className="text-xs text-rose-500 mt-1">{errors.accountLink.message}</p>}
          </div>

          {/* 粉絲數 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">粉絲 / 訂閱數（約略）</label>
            <input
              {...register('followers')}
              placeholder="例：3.5萬 / 12k"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
            />
          </div>

          {/* Email & 電話 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="your@email.com"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">電話 / LINE</label>
              <input
                {...register('phone')}
                placeholder="0912-345-678"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
              />
            </div>
          </div>

          {/* 收貨地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              收貨地址 <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('address')}
              placeholder="寄送公關品的完整地址（含郵遞區號）"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
            />
            {errors.address && <p className="text-xs text-rose-500 mt-1">{errors.address.message}</p>}
          </div>

          {/* 有興趣的商品 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">有興趣的合作商品</label>
            <input
              {...register('product')}
              placeholder="例：洗衣精、清潔系列..."
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
            />
          </div>

          {/* 備註 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">備註 / 自我介紹</label>
            <textarea
              {...register('notes')}
              placeholder="簡單介紹一下自己，或任何想說的話～"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="w-full h-11 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            {loading ? '送出中...' : '送出資料 →'}
          </button>

          <p className="text-center text-xs text-gray-400">
            你的資料僅供淨淨 CleanClean 公關合作使用
          </p>
        </div>
      </div>
    </div>
  )
}
