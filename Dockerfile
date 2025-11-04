FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
# Installiere explizit Server- und Client-Dependencies (kein Workspaces-Hoisting nötig)
RUN npm --prefix server install --no-audit --no-fund && \
    npm --prefix client install --no-audit --no-fund
COPY server server
COPY client client
RUN npm --prefix client run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Laufzeit enthält zwar Build-Artefakte, sie werden durch Bind-Mount evtl. überlagert;
# EntryPoint kümmert sich dann um (Re)Build im Container.
COPY --from=build /app/server /app/server
COPY --from=build /app/client/dist /app/client/dist
COPY .env /app/.env
COPY entrypoint.sh /app/entrypoint.sh
EXPOSE 39093
CMD ["/bin/sh", "/app/entrypoint.sh"]
