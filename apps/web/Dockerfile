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

RUN cd /app/apps/web/.next/standalone && \
    for i in 1 2 3 4 5; do \
      links=$(find . -type l 2>/dev/null); \
      [ -z "$links" ] && break; \
      echo "$links" | while IFS= read -r link; do \
        target=$(readlink "$link"); \
        case "$target" in \
          *node_modules/.bun/*) \
            pkg=$(echo "$target" | sed 's|.*node_modules/.bun/|/app/node_modules/.bun/|'); \
            if [ -e "$pkg" ]; then \
              rm -f "$link" && cp -rL "$pkg" "$link" 2>/dev/null || cp -r "$pkg" "$link" 2>/dev/null; \
            else \
              rm -f "$link"; \
            fi ;; \
          /*) \
            if [ -e "$target" ]; then \
              rm -f "$link" && cp -rL "$target" "$link" 2>/dev/null || cp -r "$target" "$link" 2>/dev/null; \
            else \
              rm -f "$link"; \
            fi ;; \
          *) \
            rm -f "$link"; ;; \
        esac; \
      done; \
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
