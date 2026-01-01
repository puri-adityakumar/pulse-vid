FROM node:20-alpine

RUN apk add --no-cache ffmpeg ffmpeg-dev

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm install typescript

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
