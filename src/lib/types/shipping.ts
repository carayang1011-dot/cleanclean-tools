export interface ShipmentProduct {
  n: string   // 品名
  s: string   // SKU/條碼
  q: number   // 數量
}

export type TmsStatus = 'pending' | 'tms_sent' | 'tms_failed'

export interface Shipment {
  id: string
  campaign: string      // 活動/來源
  date: string          // 寄件日期
  source: string        // 倉庫來源代號
  orderNo: string       // 訂單編號
  recipient: string     // 收件人
  phone: string         // 電話
  address: string       // 地址
  notes: string         // 備註
  products: string      // JSON string of ShipmentProduct[]
  tmsStatus: TmsStatus  // TMS 同步狀態
  tmsOrderId: string    // TMS 訂單編號（同步後）
  createdAt: string
}

export interface ShipmentFormData {
  campaign: string
  date: string
  source: string
  orderNo: string
  recipient: string
  phone: string
  address: string
  notes: string
  products: ShipmentProduct[]
}

// TMS 系統需要的欄位（獲利王 weberp.ktnet.com.tw）
export interface TmsOrderPayload {
  companyCode: string
  orderNo: string
  recipient: string
  phone: string
  address: string
  products: ShipmentProduct[]
  notes: string
}
