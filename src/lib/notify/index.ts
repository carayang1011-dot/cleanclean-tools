import { sendLineNotify } from './line'
import { sendSlackMessage } from './slack'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export type NotifyEvent =
  | 'request_created'
  | 'request_completed'
  | 'request_closed'

interface NotifyRequestCreated {
  event: 'request_created'
  activityName: string
  requesterName: string
  deadline?: string | null
  priority: string
  requestId: number
}

interface NotifyRequestCompleted {
  event: 'request_completed'
  activityName: string
  designerName: string
  requestId: number
}

interface NotifyRequestClosed {
  event: 'request_closed'
  activityName: string
  requesterName: string
  requestId: number
}

type NotifyPayload = NotifyRequestCreated | NotifyRequestCompleted | NotifyRequestClosed

function buildMessage(payload: NotifyPayload): string {
  const url = `${SITE_URL}/requests/${payload.requestId}`

  switch (payload.event) {
    case 'request_created':
      return [
        '📋 新設計需求',
        `活動：${payload.activityName}`,
        `提交者：${payload.requesterName}`,
        payload.deadline ? `截止日：${payload.deadline}` : null,
        `優先度：${{ urgent: '🔴 緊急', high: '🟠 高', normal: '🟡 一般', low: '🟢 低' }[payload.priority] || payload.priority}`,
        `👉 ${url}`,
      ].filter(Boolean).join('\n')

    case 'request_completed':
      return [
        '✅ 設計完成',
        `活動：${payload.activityName}`,
        `設計師 ${payload.designerName} 已完成圖稿`,
        '請檢查確認',
        `👉 ${url}`,
      ].join('\n')

    case 'request_closed':
      return [
        '🎉 需求已結案',
        `活動：${payload.activityName}`,
        `${payload.requesterName} 已確認結案`,
        `👉 ${url}`,
      ].join('\n')
  }
}

/**
 * 發送通知到 LINE Notify + Slack（如有設定）
 * 任一失敗不影響另一個
 */
export async function notify(payload: NotifyPayload): Promise<void> {
  const message = buildMessage(payload)

  // Fire both in parallel, swallow errors silently (don't block API response)
  await Promise.allSettled([
    sendLineNotify(message),
    sendSlackMessage(message),
  ])
}
