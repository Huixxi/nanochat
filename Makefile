.PHONY: dev up down logs api frontend install pull-model

# 一键启动完整环境
up:
	docker-compose up -d

# 停止所有服务
down:
	docker-compose down

# 查看日志
logs:
	docker-compose logs -f

# 本地开发 - 后端
api:
	cd backend && uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload

# 本地开发 - 前端
frontend:
	cd frontend && npm run dev

# 安装依赖
install:
	cd frontend && npm install
	cd backend && pip install -r requirements.txt

# 拉取 AI 模型
pull-model:
	ollama pull qwen2.5:7b

# 初始化数据库
init-db:
	cd backend && python -c "from models.database import Base, engine; Base.metadata.create_all(bind=engine)"

# 本地同时启动前后端
dev:
	@echo "Starting backend..."
	@cd backend && uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload &
	@echo "Starting frontend..."
	@cd frontend && npm run dev
