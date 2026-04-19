#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "📊 行銷營運中心 啟動中..."
echo "======================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ 找不到 Node.js！"
    echo "請先安裝：brew install node"
    read -p "按 Enter 關閉..."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 首次使用，安裝依賴中..."
    npm install
    echo ""
fi

echo "🚀 啟動伺服器..."
echo "======================================"
echo ""
echo "✅ 準備好後請打開瀏覽器："
echo "   👉 http://localhost:3030"
echo ""
echo "   按 Ctrl+C 可停止伺服器"
echo "======================================"
echo ""

npm run dev
