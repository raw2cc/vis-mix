FROM node:20-alpine
LABEL authors="jihuayu"

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

ENTRYPOINT ["node"]
# 默认脚本可选：如需默认 index.js 可加 CMD ["index.js"]
