FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci
COPY . .
RUN npm run build -w @my-app/shared
EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "frontend", "--", "--host"]