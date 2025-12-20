# Bidwinner AI

AI-powered RFP and grant proposal writing assistant that helps you write winning proposals by leveraging your past successful proposals.

## Features

- Upload your past winning proposals (PDF/Docx)
- AI-powered chat that retrieves relevant content from your past wins
- Vector search using MongoDB Atlas
- Persistent chat history
- Stripe payment integration
- Clerk authentication

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# MongoDB
MONGODB_URI=
MONGODB_DB_NAME=bidwinnerai

# OpenAI
OPENAI_API_KEY=

# UploadThing
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Webhooks
CLERK_WEBHOOK_SECRET=
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Important Setup Steps

1. **MongoDB Vector Search Index**: You must create a vector search index named `vector_index` on the `documentChunks` collection. See SETUP.md for details.

2. **Webhooks**: Configure Clerk and Stripe webhooks pointing to your deployment URL.

3. **UploadThing**: Set up your UploadThing account and configure the file router.

For complete setup instructions, see [SETUP.md](SETUP.md).
