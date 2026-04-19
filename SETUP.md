# 淨淨設計需求管理系統 — 完整安裝說明

## 用到的網站

| 網站 | 用途 | 網址 |
|------|------|------|
| Supabase | 資料庫、帳號登入、檔案儲存 | https://supabase.com |
| Supabase 後台（本專案） | 管理資料庫和帳號 | https://supabase.com/dashboard/project/hhebbtnkpjjmyoiqtidd |
| Node.js | 執行環境 | https://nodejs.org |

---

## 專案檔案結構

```
設計需求系統/
├── .env.local                        ← 環境變數（Supabase 金鑰）
├── .env.local.example                ← 範例環境變數
├── SETUP.md                          ← 本說明文件
├── middleware.ts                     ← 路由保護（未登入導向 /login）
├── package.json                      ← 專案依賴清單
├── tailwind.config.ts                ← 品牌色設定
│
├── supabase/
│   ├── migrations/001_initial.sql    ← 建立所有資料表 SQL
│   └── seed.sql                      ← 建立 15 個渠道資料 SQL
│
└── src/
    ├── app/
    │   ├── (auth)/login/             ← 登入頁面
    │   └── (main)/
    │       ├── dashboard/            ← 首頁（依角色顯示不同內容）
    │       ├── requests/new/         ← 新增需求（步驟表單）
    │       ├── requests/[id]/        ← 需求詳情
    │       ├── history/              ← 歷史記錄（表格）
    │       └── admin/                ← 管理員後台
    │
    ├── components/
    │   ├── ui/                       ← 基本 UI 元件（按鈕、輸入框等）
    │   ├── layout/                   ← 側邊欄、頂部導覽
    │   ├── request-form/             ← 步驟表單元件
    │   ├── request-detail/           ← 需求詳情元件
    │   └── history-table/            ← 歷史記錄表格元件
    │
    └── lib/
        ├── types.ts                  ← 資料型別定義
        ├── utils.ts                  ← 工具函式（日期格式、狀態標籤等）
        ├── constants.ts              ← 狀態流轉規則
        └── supabase/                 ← Supabase 連線設定
```

---

## 首次安裝步驟

### 第一步：安裝 Node.js（只需做一次）

1. 前往 https://nodejs.org 下載 **LTS 版本**
2. 安裝完成後開終端機確認：
   ```
   node --version
   ```

### 第二步：安裝專案依賴（只需做一次）

```bash
cd '/Volumes/MU P100 1TB/claude_司/設計需求系統'
npm install
```

### 第三步：建立 Supabase 資料庫（已完成）

已完成，Supabase 後台：
https://supabase.com/dashboard/project/hhebbtnkpjjmyoiqtidd

執行過的 SQL：
1. `supabase/migrations/001_initial.sql`（建立所有資料表）
2. `supabase/seed.sql`（建立 15 個渠道）

### 第四步：環境變數（已設定）

`.env.local` 已設定好，不需要再動。

### 第五步：新增使用者帳號

如需新增同事帳號，到 Supabase Auth 頁面：
https://supabase.com/dashboard/project/hhebbtnkpjjmyoiqtidd/auth/users

點 **Add user → Create new user**，填入 Email 和密碼。

**設定角色（預設是需求方，設計師或管理員需手動改）：**
```sql
-- 設為設計師
UPDATE profiles SET role = 'designer' WHERE email = '帳號@email.com';

-- 設為管理員
UPDATE profiles SET role = 'admin' WHERE email = '帳號@email.com';
```

SQL Editor：
https://supabase.com/dashboard/project/hhebbtnkpjjmyoiqtidd/sql/new

---

## 每次啟動系統

```bash
cd '/Volumes/MU P100 1TB/claude_司/設計需求系統'
npm run dev
```

打開瀏覽器：http://localhost:3000

---

## 功能說明

| 角色 | 功能 |
|------|------|
| 需求方（requester） | 提交需求、追蹤自己的需求、留言討論 |
| 設計師（designer） | Kanban 看板、更新需求狀態、上傳完成檔案 |
| 管理員（admin） | 所有功能 + 使用者管理 + Excel 歷史資料匯入 |

### 狀態流程

```
待處理 → 進行中 → 審核中 → 已完成
                  ↓
                修改中 → 審核中
```

---

## Excel 匯入格式（管理員功能）

每個 Sheet = 一個渠道（Sheet 名稱需與渠道名稱完全相符，例如「官網活動」）

欄位順序（第一列為標題，從第二列開始為資料）：

| 欄位 | 說明 |
|------|------|
| 活動期間 | 例如 2024/01~2024/03 |
| 活動內容 | 必填 |
| 用途 | |
| 尺寸 | |
| 數量 | |
| 文案 | |
| 需求內容(產品) | |
| 最晚交件日 | |
| 備註/負責人 | |
| 進度 | 已完成／進行中／審核中／修改／待處理 |
| 發需求的人 | |
