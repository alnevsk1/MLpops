# Этап 1: Сборка (Build)
FROM node:22-alpine AS builder

WORKDIR /app

# Копируем package.json и устанавливаем пакеты
COPY package.json package-lock.json* ./
RUN npm install

# Копируем исходники и собираем проект
COPY . .
RUN npm run build

# Этап 2: Раздача статики (Production)
FROM nginx:alpine

# Удаляем стандартный конфиг Nginx и копируем наш
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# Копируем собранные файлы React из первого этапа
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]