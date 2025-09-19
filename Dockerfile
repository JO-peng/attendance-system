# 使用Python 3.9官方镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY backend/requirements.txt /app/

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/
COPY ca/ /app/ca/

# 创建必要的目录
RUN mkdir -p /app/backend/uploads/photos \
    && mkdir -p /app/backend/uploads/feedback \
    && mkdir -p /app/backend/instance \
    && mkdir -p /app/backend/logs

# 设置权限
RUN chmod -R 755 /app/backend/uploads \
    && chmod -R 755 /app/backend/instance \
    && chmod -R 755 /app/backend/logs

# 切换到backend目录
WORKDIR /app/backend

# 暴露端口
EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# 启动命令
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "app:app"]