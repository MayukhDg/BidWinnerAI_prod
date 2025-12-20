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

# UploadThing
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Webhooks
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# App URL (for webhooks and redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
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

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy

### Other Platforms

Make sure to:
- Set all environment variables
- Configure webhook URLs for Clerk and Stripe
- Ensure MongoDB Atlas allows connections from your deployment IP
- Set `NEXT_PUBLIC_APP_URL` to your production URL

## Testing

1. Sign up for an account
2. Upload a PDF or Word document
3. Wait for processing (check document status)
4. Start a new chat
5. Paste an RFP requirement or ask a question
6. The AI should retrieve relevant content from your uploaded documents

## Troubleshooting

### Documents not processing
- Check MongoDB connection
- Verify OpenAI API key is valid
- Check server logs for errors
- Ensure document file is accessible from UploadThing URL

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
