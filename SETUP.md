# Bidwinner AI Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. MongoDB Atlas account with Vector Search enabled
3. Clerk account for authentication
4. UploadThing account for file uploads
5. Stripe account for payments
6. OpenAI API key

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# MongoDB
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB_NAME=bidwinnerai

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# UploadThing (v7 uses a single token)
UPLOADTHING_TOKEN=your_uploadthing_token

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Webhooks
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# App URL (for webhooks and redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Inngest Setup (Background Processing)

Inngest handles document processing in the background, ensuring reliable processing regardless of document size.

### Local Development

1. Install the Inngest CLI:
```bash
npm install -g inngest-cli
```

2. Start the Inngest dev server (in a separate terminal):
```bash
npx inngest-cli@latest dev
```

3. The dev server runs at http://localhost:8288 and shows all functions and events

### Production (Vercel)

1. Sign up at [inngest.com](https://www.inngest.com)
2. Create a new app in Inngest dashboard
3. Get your signing key from the Inngest dashboard
4. Add environment variable in Vercel:
```env
INNGEST_SIGNING_KEY=your_inngest_signing_key
INNGEST_EVENT_KEY=your_inngest_event_key
```

5. After deploying, sync your app:
   - Go to Inngest Dashboard → Apps
   - Add your production URL: `https://your-domain.com/api/inngest`
   - Inngest will discover your functions automatically

### Environment Variables for Inngest

```env
# For production only (not needed in dev)
INNGEST_SIGNING_KEY=signkey-xxx
INNGEST_EVENT_KEY=xxx
```

## MongoDB Vector Search Index Setup

1. Go to your MongoDB Atlas dashboard
2. Navigate to your cluster → Search → Create Search Index
3. Select "JSON Editor" option
4. Use the following configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

5. Name the index: `vector_index`
6. Select the collection: `documentChunks`
7. Create the index (this may take a few minutes)

## Clerk Webhook Setup

1. Go to Clerk Dashboard → Webhooks
2. Create a new webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the webhook signing secret to `CLERK_WEBHOOK_SECRET` in `.env.local`

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`

## Running the Application

### Development Mode

1. Start Inngest dev server (in terminal 1):
```bash
npx inngest-cli@latest dev
```

2. Start the Next.js dev server (in terminal 2):
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. View background jobs at [http://localhost:8288](http://localhost:8288)

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add all environment variables (including Inngest keys)
4. Deploy
5. After deploy, add your Vercel URL to Inngest dashboard

### Other Platforms

Make sure to:
- Set all environment variables
- Configure webhook URLs for Clerk, Stripe, and Inngest
- Ensure MongoDB Atlas allows connections from your deployment IP
- Set `NEXT_PUBLIC_APP_URL` to your production URL

## Testing

1. Sign up for an account
2. Upload a PDF or Word document
3. Watch processing progress in the UI (or Inngest dashboard)
4. Start a new chat
5. Paste an RFP requirement or ask a question
6. The AI should retrieve relevant content from your uploaded documents

## Troubleshooting

### Documents not processing
- Check Inngest dashboard for function errors
- Verify MongoDB connection
- Verify OpenAI API key is valid
- Check server logs for errors
- Ensure document file is accessible from UploadThing URL

### Inngest functions not running
- Ensure Inngest dev server is running locally
- Verify INNGEST_SIGNING_KEY in production
- Check that /api/inngest is accessible (not blocked by auth)
- View function logs in Inngest dashboard

### Vector search not working
- Verify MongoDB Vector Search index is created
- Check index name matches `vector_index`
- Ensure embeddings are being generated (1536 dimensions)
- Verify collection name is `documentChunks`

### Webhooks not working
- Verify webhook URLs are correct
- Check webhook secrets match
- Ensure webhook endpoints are publicly accessible
- Check webhook logs in Clerk/Stripe dashboards
