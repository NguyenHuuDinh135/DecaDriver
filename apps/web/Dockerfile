FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat curl bash
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"
WORKDIR /app
COPY . .
RUN bun install
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN cd apps/web && bun run --bun node_modules/next/dist/bin/next build
RUN cd apps/web/.next/standalone && \
    find . -type l | while read link; do \
      target=$(readlink -f "$link" 2>/dev/null); \
      if [ -n "$target" ] && [ -e "$target" ]; then \
        rm -f "$link" && cp -r "$target" "$link"; \
      else \
        rm -f "$link"; \
      fi; \
    done || true

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
