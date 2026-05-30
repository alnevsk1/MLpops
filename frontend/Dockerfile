# Этап 1: Сборка (Build)
FROM node:22-alpine AS builder

WORKDIR /app/frontend

# Копируем package.json и устанавливаем пакеты
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Копируем исходники фронтенда
COPY frontend/ .

# Копируем корневой .env в родительскую директорию (envDir: '..' в vite.config.js)
COPY .env /app/.env

RUN npm run build

# Этап 2: Раздача статики (Production)
FROM nginx:alpine

# Удаляем стандартный конфиг Nginx и копируем наш
RUN rm /etc/nginx/conf.d/default.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/

# Копируем собранные файлы React из первого этапа
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
