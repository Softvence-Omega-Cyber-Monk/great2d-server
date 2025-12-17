// config/paypal.config.ts

import { registerAs } from '@nestjs/config';

export default registerAs('paypal', () => ({
  mode: process.env.PAYPAL_MODE || 'sandbox', // 'sandbox' or 'live'
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  returnUrl: process.env.PAYPAL_RETURN_URL || 'http://localhost:3000/payment/success',
  cancelUrl: process.env.PAYPAL_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  webhookId: process.env.PAYPAL_WEBHOOK_ID,
}));


// Add to your .env file:
// PAYPAL_MODE=sandbox
// PAYPAL_CLIENT_ID=your_client_id_here
// PAYPAL_CLIENT_SECRET=your_client_secret_here
// PAYPAL_RETURN_URL=http://localhost:3000/payment/success
// PAYPAL_CANCEL_URL=http://localhost:3000/payment/cancel
// PAYPAL_WEBHOOK_ID=your_webhook_id_here