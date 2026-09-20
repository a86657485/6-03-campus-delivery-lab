#!/bin/zsh
cd "${0:A:h}" || exit 1
runtime_node=""
for candidate in "$(command -v node 2>/dev/null)" /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"; do
  if [[ -x "$candidate" ]] && "$candidate" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" 2>/dev/null; then
    runtime_node="$candidate"
    break
  fi
done
if [[ -z "$runtime_node" ]]; then
  echo "没有找到可用的 Node.js 22.13 或更新版本，请安装后再次双击启动。"
  read "?按回车键关闭"
  exit 1
fi
export PORT="${PORT:-8784}"
export DATA_DIR="${DATA_DIR:-$PWD/runtime}"
echo "学生入口：http://localhost:$PORT"
echo "教师大屏：http://localhost:$PORT/teacher"
echo "教师密码文件：$DATA_DIR/teacher-password.txt"
(
  for i in {1..30}; do
    if curl -fsS "http://localhost:$PORT/api/classes" >/dev/null 2>&1; then
      open "http://localhost:$PORT/teacher"
      [[ -f "$DATA_DIR/teacher-password.txt" ]] && open -a TextEdit "$DATA_DIR/teacher-password.txt"
      break
    fi
    sleep 1
  done
) &
"$runtime_node" --no-warnings server.cjs
read "?课堂服务已停止，按回车键关闭"
