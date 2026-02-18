# Backend (SQLite)

- **运行**: `cd backend && npm install && npm run dev`
- **端口**: 3001
- **API**:
  - `GET /api/items` 获取列表
  - `POST /api/items` 创建项，body: `{ "name": "..." }`

数据库文件: `backend/data.db`（首次请求时自动创建）
