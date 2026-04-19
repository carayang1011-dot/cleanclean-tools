'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Leaf, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo + Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-800 shadow-lg">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-800">淨淨 Clean Clean</h1>
          <p className="text-sm text-muted-foreground">設計需求管理系統</p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">登入</CardTitle>
            <CardDescription className="text-center">
              {sent ? '請查看你的信箱' : '輸入公司 Email，我們寄登入連結給你'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <MailCheck className="h-12 w-12 text-brand-800" />
                <p className="text-sm text-muted-foreground">
                  登入連結已寄到 <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  點信件中的連結即可進入系統，連結 1 小時內有效
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSent(false)}
                  className="text-muted-foreground"
                >
                  重新輸入 Email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">電子郵件</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-brand-800 hover:bg-brand-900 text-white"
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />寄送中…</> : '寄送登入連結'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          如需建立帳號，請聯絡管理員
        </p>
      </div>
    </div>
  )
}
