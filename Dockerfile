FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data
USER node
EXPOSE 3000
VOLUME ["/app/server/data"]
CMD ["npm", "start"]
