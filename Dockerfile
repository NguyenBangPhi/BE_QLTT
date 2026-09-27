FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini
COPY package.json package-lock.json ./

# package-lock.json của repo không đồng bộ với package.json ("Missing: typescript@5.9.3
# from lock file") nên `npm ci` luôn thất bại. Dùng `npm install` cho tới khi lock được
# tạo lại — xem docs/BACKEND-PATCH-NOTES.md.
FROM base AS deps
RUN npm install --no-audit --no-fund

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "start:dev"]

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS prod
WORKDIR /app
RUN apk add --no-cache tini
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
