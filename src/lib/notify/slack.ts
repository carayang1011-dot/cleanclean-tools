/**
 * Slack Incoming Webhook 通知
 * URL 設定：SLACK_WEBHOOK_URL in .env.local
 *
 * 設定步驟：
 * 1. 前往 https://api.slack.com/apps → 「Create New App」→「From scratch」
 * 2. 選擇 Workspace → 「Incoming Webhooks」→ 開啟 → 「Add New Webhook to Workspace」
 * 3. 選擇頻道 → 複製 Webhook URL 填入 .env.local
 */

export async function sendSlackMessage(message: string): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('[Slack] SLACK_WEBHOOK_URL not set, skipping notification')
    return { success: false, error: 'SLACK_WEBHOOK_URL not set' }
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Slack webhook error ${res.status}: ${text}`)
    }

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Slack] Failed:', msg)
    return { success: false, error: msg }
  }
}
