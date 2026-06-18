#!/bin/bash

echo "=========================================="
echo "  政务办事大厅系统 - 一键启动脚本"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "[1/4] 检查并安装后端依赖..."
cd "$ROOT_DIR/server"
if [ ! -d "node_modules" ]; then
  echo "正在安装后端依赖..."
  npm install
else
  echo "后端依赖已安装"
fi

echo ""
echo "[2/4] 检查并安装前端依赖..."
cd "$ROOT_DIR/web"
if [ ! -d "node_modules" ]; then
  echo "正在安装前端依赖..."
  npm install
else
  echo "前端依赖已安装"
fi

echo ""
echo "[3/4] 启动后端服务 (端口: 3000)..."
cd "$ROOT_DIR/server"
npm run start:dev &
SERVER_PID=$!

echo ""
echo "[4/4] 启动前端应用 (端口: 5173)..."
cd "$ROOT_DIR/web"
npm run dev &
WEB_PID=$!

echo ""
echo "=========================================="
echo "  启动完成！"
echo "  前端地址: http://localhost:5173"
echo "  后端地址: http://localhost:3000"
echo ""
echo "  演示账号:"
echo "    普通用户: user / user123"
echo "    管理员:   admin / admin123"
echo ""
echo "  按 Ctrl+C 停止服务"
echo "=========================================="

trap "echo '正在停止服务...'; kill $SERVER_PID $WEB_PID 2>/dev/null; exit 0" INT TERM

wait
