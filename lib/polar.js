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
export const CREDIT_PACKAGES = {
  ONE_CREDIT: {
    id: 'one_credit',
    productId: process.env.NEXT_PUBLIC_POLAR_PRODUCT_1_CREDIT_ID,
    price: 1500,
    credits: 1,
    name: '1 RFP Credit',
  },
  FIVE_CREDITS: {
    id: 'five_credits',
    productId: process.env.NEXT_PUBLIC_POLAR_PRODUCT_5_CREDITS_ID,
    price: 6000,
    credits: 5,
    name: '5 RFP Credits',
  },
};
