export type PaymentStatus = '未付款' | '已付款' | '已確認'
export type TaxType = '含稅' | '未稅' | '免稅'

export interface Payment {
  id: string
  content: string       // 對象/內容
  dueDate: string       // 到期日
  paidDate: string      // 付款日
  amount: string        // 金額
  taxType: TaxType | string
  docConfirmed: string  // 文件確認 (true/false)
  docRef: string        // 發票/單號
  bankInfo: string      // 匯款資訊
  note: string          // 備註
  status: PaymentStatus
}

export interface PaymentFormData {
  content: string
  dueDate: string
  paidDate: string
  amount: string
  taxType: string
  docConfirmed: string
  docRef: string
  bankInfo: string
  note: string
  status: PaymentStatus
}
