/**
 * LINE Notify 通知
 * Token 設定：LINE_NOTIFY_TOKEN in .env.local
 *
 * 申請步驟：
 * 1. 前往 https://notify-bot.line.me/zh_TW/
 * 2. 登入 LINE 帳號 → 「個人頁面」→「發行存取權杖」
 * 3. 輸入服務名稱 → 選擇通知接收群組或 1:1 聊天
 * 4. 複製 Token 填入 .env.local
 */

const LINE_NOTIFY_API = 'https://notify-api.line.me/api/notify'

export async function sendLineNotify(message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.LINE_NOTIFY_TOKEN
  if (!token) {
    console.warn('[LINE Notify] LINE_NOTIFY_TOKEN not set, skipping notification')
    return { success: false, error: 'LINE_NOTIFY_TOKEN not set' }
  }

  try {
    const res = await fetch(LINE_NOTIFY_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ message }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`LINE Notify error ${res.status}: ${text}`)
    }

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[LINE Notify] Failed:', msg)
    return { success: false, error: msg }
  }
}
