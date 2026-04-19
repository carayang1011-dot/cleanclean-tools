export const STATUS_ORDER = ['pending', 'in_progress', 'review', 'revision', 'completed'] as const

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:     ['in_progress'],
  in_progress: ['review', 'pending'],
  review:      ['completed', 'revision', 'in_progress'],
  revision:    ['in_progress'],
  completed:   [],
}

export const HARDCODED_DESIGNERS = ['酥酥', '小花', 'VIDA'] as const

export const CHANNEL_ICONS: Record<string, string> = {
  'website-activity':   '🌐',
  'flagship-store':     '🏪',
  'department-popup':   '🏬',
  'department-instore': '🏢',
  'shopee':             '🛒',
  'mo-store':           '📦',
  'line-at':            '💬',
  'fb-ads':             '📱',
  'group-buy':          '👥',
  'facebook-page':      '👍',
  'crm':                '📧',
  'crm-vip':            '💎',
  'outdoor-ads':        '📺',
  'cross-industry':     '🤝',
  'distributor':        '🏭',
}
