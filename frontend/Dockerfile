# Paso 1: Compilación
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Paso 2: Servidor Web
FROM nginx:alpine

# Copiamos la compilación al directorio de nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuramos nginx para enrutar todo al index.html (SPA)
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
