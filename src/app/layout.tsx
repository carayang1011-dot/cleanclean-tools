import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: '淨淨｜設計需求管理系統',
  description: '淨淨設計需求提交與追蹤平台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
