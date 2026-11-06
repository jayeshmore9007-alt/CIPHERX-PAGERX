FROM node:20-alpine
RUN apk add --no-cache unzip binutils openssh-client openjdk17-jre curl
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src ./src
COPY test ./test
ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD curl -fsS http://localhost:8080/api/health || exit 1
CMD ["node", "src/index.js"]
