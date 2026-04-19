export type Role = 'requester' | 'designer' | 'admin'
export type Status = 'pending' | 'in_progress' | 'review' | 'revision' | 'completed'
export type Priority = 'urgent' | 'high' | 'normal' | 'low'
export type FileType = 'deliverable' | 'reference' | 'revision'

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  avatar_url: string | null
  created_at: string
}

export interface DefaultSize {
  name: string
  size: string
}

export interface Channel {
  id: number
  name: string
  slug: string
  sort_order: number
  default_sizes: DefaultSize[] | null
}

export interface DesignRequest {
  id: number
  channel_id: number | null
  activity_period: string | null
  activity_name: string
  purpose: string
  size_spec: string | null
  quantity: number
  copywriting: string | null
  product_info: string | null
  reference_urls: string[] | null
  deadline: string | null
  requester_id: string | null
  designer_id: string | null
  status: Status
  priority: Priority
  notes: string | null
  // Historical import fields
  requester_name: string | null
  designer_name: string | null
  imported_from_sheet: string | null
  source_row: number | null
  created_at: string
  updated_at: string
  channel?: Channel
  requester?: Profile | null
  designer?: Profile | null
}

export interface RequestFile {
  id: number
  request_id: number
  file_name: string
  file_url: string
  file_type: FileType
  uploaded_by: string
  uploaded_at: string
  uploader?: Profile
}

export interface Comment {
  id: number
  request_id: number
  author_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface StatusHistory {
  id: number
  request_id: number
  old_status: Status | null
  new_status: Status
  changed_by: string
  note: string | null
  created_at: string
  changer?: Profile
}

// ── 合作紀錄 ─────────────────────────────────────────────────────────────────

export interface Cooperation {
  id: number
  data_source: string | null
  is_paid: string | null          // '是' | '否'
  cooperation_type: string | null // '直接費用' | '團購分潤'
  tier: string | null
  year: number | null
  start_date: string | null
  end_date: string | null
  raw_date_text: string | null
  creator_name: string
  platform: string | null
  social_url: string | null
  product: string | null
  group_buy_system: string | null
  content_format: string | null
  owner: string | null
  status: string | null
  discount: string | null
  commission_rate: number | null
  fee_excl_tax: number | null
  fee_incl_tax: number | null
  order_count: number | null
  revenue_excl_tax: number | null
  commission_excl_tax: number | null
  aov: number | null
  ad_authorization: string | null
  quote_note: string | null
  shipping_info: string | null
  bank_info: string | null
  paid_amount: number | null
  paid_date: string | null
  labor_report_no: string | null
  paid_match_note: string | null
  is_potential_duplicate: boolean
  created_at: string
  updated_at: string
}

// Form schema types
export interface NewRequestForm {
  channel_id: number
  activity_period: string
  activity_name: string
  purpose: string
  size_spec: string
  quantity: number
  copywriting: string
  product_info: string
  reference_urls: string[]
  deadline: string
  priority: Priority
  notes: string
}
