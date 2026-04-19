# 部署指南

## 環境變數清單

複製 `.env.local.example` 為 `.env.local`，填入以下所有值：

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Sheets API（服務帳號）
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id

# 通知（選填）
LINE_NOTIFY_TOKEN=your-line-notify-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# TMS 獲利王（公關寄件功能需要）
TMS_COMPANY_CODE=your-company-code
TMS_USERNAME=your-tms-username
TMS_PASSWORD=your-tms-password
TMS_BASE_URL=https://weberp.ktnet.com.tw

# App
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

---

## Vercel 部署步驟

1. 將專案推送到 GitHub
2. 前往 [vercel.com](https://vercel.com) → Import Project → 選擇 GitHub repo
3. Framework：**Next.js**（自動偵測）
4. 在「Environment Variables」加入以上所有變數
5. 點擊 Deploy

### 自訂網域

Vercel Dashboard → Settings → Domains → Add Domain

---

## Google Sheets 服務帳號設定

1. 前往 [console.cloud.google.com](https://console.cloud.google.com)
2. 建立專案 → 啟用「Google Sheets API」
3. IAM & Admin → Service Accounts → Create
4. 建立金鑰（JSON 格式）→ 下載
5. 從 JSON 取出 `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
6. 從 JSON 取出 `private_key` → `GOOGLE_PRIVATE_KEY`
7. 開啟 Google Spreadsheet → 分享給服務帳號 email（編輯者）

### Google Sheets 工作表名稱

系統需要以下工作表（第一行為表頭）：

| 工作表名稱 | 用途 |
|-----------|------|
| KOC許願 | KOC 許願單 |
| 匯款追蹤 | 匯款管理 |
| 公關寄件 | 公關品寄件 |
| 合作排程 | 合作排程 |
| 團購紀錄 | 團購合作紀錄 |
| 公關邀約 | 公關邀約名單 |
| 公關名單 | 公關自邀名單 |

每張表第一行欄位如下：

**KOC許願**：`id | kocName | platform | kocLink | followers | collabType | product | reason | submittedBy | status | createdAt`

**匯款追蹤**：`id | content | dueDate | paidDate | amount | taxType | docConfirmed | docRef | bankInfo | note | status`

**公關寄件**：`id | campaign | date | source | orderNo | recipient | phone | address | notes | products | tmsStatus | tmsOrderId | createdAt`

**合作排程**：`id | startDate | endDate | name | platform | type | revenue | orders | avgOrder | commission | status | progress | owner | notes | createdAt`

**團購紀錄**：`id | year | openDate | kol | status | discount | source | system | owner | commission | notes | createdAt`

**公關邀約**：`id | owner | status | type | name | followers | link | product | contactLog | quote | finalSpec | note | address | createdAt`

**公關名單**：`id | name | platform | followers | category | link | email | contact | address | notes | status | lastCoopDate | createdAt`

---

## Supabase 設定

### 關閉自助註冊
1. Supabase Dashboard → Authentication → Providers → Email
2. **Disable sign ups** → 開啟

### Email Allowlist
1. Authentication → Settings → Restrict sign-ups to email domain
2. 填入公司 email 網域

### RLS 政策範本

```sql
-- profiles 表
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

-- design_requests 表（requesters 只能看自己的）
ALTER TABLE design_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters see own requests"
ON design_requests FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('designer', 'admin')
  OR requester_id = auth.uid()
);
```

---

## LINE Notify Token 申請

1. 前往 https://notify-bot.line.me/zh_TW/
2. 登入 LINE 帳號 → 「個人頁面」→「發行存取權杖」
3. 輸入服務名稱（例：淨淨設計通知）
4. 選擇接收通知的群組（建議建立專用群組）
5. 複製 Token → 填入 `.env.local` 的 `LINE_NOTIFY_TOKEN`

**測試指令：**
```bash
curl -X POST https://notify-api.line.me/api/notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "message=測試通知"
```

---

## Slack Webhook 設定

1. 前往 https://api.slack.com/apps → Create New App
2. 選擇 Workspace → Incoming Webhooks → 開啟
3. Add New Webhook to Workspace → 選擇頻道
4. 複製 Webhook URL → 填入 `SLACK_WEBHOOK_URL`

**測試指令：**
```bash
curl -X POST YOUR_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  --data '{"text":"測試 Slack 通知"}'
```

---

## TMS 設定注意事項

TMS 自動填表功能使用 Playwright 瀏覽器自動化，需要：

1. 安裝 Playwright 瀏覽器：
   ```bash
   npx playwright install chromium
   ```

2. Vercel 部署時需要 serverless function 支援 Playwright（建議使用 Vercel Edge Runtime 或改用有 Playwright 支援的方案）

3. TMS 的實際 CSS selector 需根據獲利王介面調整，位於：
   - `src/lib/tms/client.ts`
   - `src/lib/tms/submit-order.ts`
