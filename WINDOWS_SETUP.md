# Windows 環境啟動說明

## 前置條件
- 安裝 [Node.js 20+](https://nodejs.org/)（LTS 版本）
- 安裝 [VS Code](https://code.visualstudio.com/)（選用）

## 步驟

### 1. 解壓縮備份
將 `設計需求系統_backup_20260416.zip` 解壓到任意目錄，例如：
```
C:\Users\你的名字\設計需求系統\
```

### 2. 安裝依賴
用命令提示字元 (cmd) 或 PowerShell 進入資料夾：
```bash
cd C:\Users\你的名字\設計需求系統
npm install
```
（約需等待 2-5 分鐘，會重建 node_modules）

### 3. 確認 .env.local
`.env.local` 已包含在備份中，不需要重新設定。

### 4. 啟動開發伺服器
```bash
npm run dev
```

打開瀏覽器前往 http://localhost:3000

## 注意事項
- Google Sheets 憑證（.env.local 中的 `GOOGLE_PRIVATE_KEY`）已包含，直接可用
- Supabase 連線設定也已包含在 .env.local
- 如果 PowerShell 顯示「無法執行腳本」錯誤，請執行：
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
