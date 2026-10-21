# 13 — Deployment (Docker → Google Cloud Run)

## 1. Dockerfile (multi-stage)

```dockerfile
# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime ----
FROM node:22-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./
USER node
EXPOSE 8080
CMD ["node", "dist/server/index.js"]
```
`.dockerignore`: `node_modules`, `dist`, `coverage`, `.git`, `.env*`, `tests`, `playwright-report`, `test-results`, `docs`.

The server must listen on `process.env.PORT` and `0.0.0.0`.

## 2. Local production check
```bash
docker build -t mehfil .
docker run --rm -p 8080:8080 -e GEMINI_API_KEY="$GEMINI_API_KEY" mehfil
# open http://localhost:8080 ; curl localhost:8080/api/health
```

## 3. Cloud Run (the user runs these; the agent writes them into README)

```bash
PROJECT_ID=your-project-id
REGION=asia-south1            # Mumbai; pick the region nearest your users

gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com

# store the key once
printf '%s' "YOUR_GEMINI_KEY" | gcloud secrets create gemini-api-key --data-file=-

# allow Cloud Run's runtime service account to read it
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# build from source and deploy
gcloud run deploy mehfil \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars GEMINI_MODEL=gemini-3.6-flash,NODE_ENV=production \
  --memory 512Mi --cpu 1 --min-instances 0 --max-instances 3 \
  --concurrency 40 --timeout 60
```
`--max-instances 3` caps cost in case of abuse (together with rate limits).

## 4. Post-deploy smoke test
```bash
URL=$(gcloud run services describe mehfil --region $REGION --format='value(status.url)')
curl -s $URL/api/health            # {"status":"ok","ai":"enabled",...}
curl -sI $URL | grep -i content-security-policy
```
Then open the URL, run the "Jaipur wedding" sample and confirm ideas say "DRAFTED BY GEMINI".

## 5. Troubleshooting
- Ideas say "From the Mehfil library" in production → check `/api/health` `ai` field; check secret binding; check logs (`gcloud run services logs read mehfil --region $REGION`) for `ai_error` entries (status code only, never the key).
- 400 from Gemini after a model update → see `03` model note; set `GEMINI_MODEL` to another current Flash model ID and redeploy.
