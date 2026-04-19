'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Leaf, UserPlus, Check } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function SetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setProfiles(data ?? [])
        setLoading(false)
      })
  }, [])

  const selectProfile = async (profile: Profile) => {
    const res = await fetch('/api/auth/select-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id }),
    })
    if (!res.ok) {
      alert('選擇身份失敗，請再試一次')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const addAndSelect = async () => {
    if (!newName.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .from('profiles')
      .insert({ name: newName.trim(), email: '', role: 'requester' })
      .select()
      .single()

    if (error || !data) {
      alert('新增失敗，請再試一次')
      setSaving(false)
      return
    }

    selectProfile(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-800 shadow-lg">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-800">淨淨 Clean Clean</h1>
          <p className="text-sm text-muted-foreground">行銷營運中心</p>
        </div>

        <div className="space-y-3">
          <p className="text-center font-medium text-gray-700">你是誰？</p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-800" />
            </div>
          ) : (
            <div className="grid gap-2">
              {profiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectProfile(p)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl border bg-white hover:bg-brand-50 hover:border-brand-400 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.role === 'admin' ? '管理員' : p.role === 'designer' ? '設計師' : '需求方'}
                    </p>
                  </div>
                  <Check className="h-4 w-4 text-brand-600 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {adding ? (
            <Card className="border-brand-200">
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1">
                  <Label>你的名字</Label>
                  <Input
                    autoFocus
                    placeholder="輸入你的名字"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addAndSelect()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-brand-800 hover:bg-brand-900 text-white"
                    onClick={addAndSelect}
                    disabled={saving || !newName.trim()}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '進入系統'}
                  </Button>
                  <Button variant="outline" onClick={() => setAdding(false)}>取消</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-brand-400 hover:text-brand-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              我不在清單裡
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
