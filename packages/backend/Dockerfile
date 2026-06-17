FROM node:20-alpine
WORKDIR /app

# Copy root and package-specific manifests for caching dependency installation layers
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install all monorepo dependencies
RUN npm ci

# Copy the actual code files
COPY . .

# CRITICAL FIX: Build the shared library first so types are available to the backend
RUN npm run build -w @my-app/shared

# Now compile the backend workspace safely
RUN npm run build -w backend

EXPOSE 5000
CMD ["npm", "run", "start", "-w", "backend"]