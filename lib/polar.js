import { Polar } from '@polar-sh/sdk';

if (!process.env.POLAR_ACCESS_TOKEN) {
  console.warn('Warning: POLAR_ACCESS_TOKEN is not set');
}

// Use sandbox server when POLAR_SANDBOX is set to 'true'
const isSandbox = process.env.POLAR_SANDBOX === 'true';

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // Use sandbox API for testing, production API otherwise
  server: isSandbox ? 'sandbox' : 'production',
});

// Product configuration
export const POLAR_CONFIG = {
  // Set this to your Polar product ID after creating it in the Polar dashboard
  productId: process.env.POLAR_PRODUCT_ID,
  price: 6000, // $60.00 in cents
  productName: 'BidWinner AI Pro - Lifetime Access',
};
