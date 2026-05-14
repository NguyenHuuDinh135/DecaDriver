FROM oven/bun:1.3-alpine
RUN apk add --no-cache nodejs libc6-compat
WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/ ./packages/ui/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY packages/eslint-config/ ./packages/eslint-config/
RUN bun install --production
COPY apps/web/ ./apps/web/
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN cd apps/web && node node_modules/.bin/next build
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["node", "node_modules/.bin/next", "start"]
