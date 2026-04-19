import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: '淨淨｜行銷營運中心',
  description: '淨淨 CleanClean 行銷營運中心',
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
