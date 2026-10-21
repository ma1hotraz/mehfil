# Optional: run the production server in a container (the primary deployment target is Vercel).
# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: plain Alpine plus the Node binary, one bundled server file and the static client.
# Copying only the binary (instead of the node image) leaves out npm and yarn, which are not needed.
FROM alpine:3.22
ENV NODE_ENV=production PORT=8080
RUN apk add --no-cache libstdc++ && adduser -D -u 1000 app
COPY --from=build /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=build --chown=app:app /app/dist ./dist
USER app
EXPOSE 8080
CMD ["node", "dist/server.mjs"]
