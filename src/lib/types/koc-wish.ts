export type KocPlatform = 'Instagram' | 'YouTube' | 'Facebook' | 'TikTok' | '小紅書' | '其他'
export type KocCollabType = '業配' | '團購' | '公關品' | '開箱' | '活動邀請' | '待討論' | ''
export type KocStatus = '待審核' | '評估中' | '已接洽' | '已合作' | '不適合'

export interface KocWish {
  id: string
  kocName: string
  platform: KocPlatform
  kocLink: string
  followers: string
  collabType: KocCollabType
  product: string
  reason: string
  submittedBy: string
  status: KocStatus
  createdAt: string
}

export interface KocWishFormData {
  kocName: string
  platform: KocPlatform
  kocLink: string
  followers: string
  collabType: KocCollabType
  product: string
  reason: string
  submittedBy: string
}
