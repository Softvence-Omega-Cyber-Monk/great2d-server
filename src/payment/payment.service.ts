import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
    private stripe: Stripe;

    constructor(private configService: ConfigService) {
        this.stripe = new Stripe(
            this.configService.get<any>('STRIPE_SECRET_KEY'),
            { apiVersion: '2025-12-15.clover' }
        );
    }

    async createPaymentIntent(amount: number, currency: string = 'usd') {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            if (!paymentIntent.client_secret) {  // Add this null check
                throw new Error('Payment intent created but client secret is missing');
            }

            return {
                clientSecret: paymentIntent.client_secret,  // Now TypeScript knows it's not null
                paymentIntentId: paymentIntent.id,
            };
        } catch (error) {
            throw new Error(`Failed to create payment intent: ${error.message}`);
        }
    }

    async createCustomer(email: string, name?: string) {
        try {
            const customer = await this.stripe.customers.create({
                email,
                name,
            });

            return {
                customerId: customer.id,
            };
        } catch (error) {
            throw new Error(`Failed to create customer: ${error.message}`);
        }
    }

    async getPaymentIntent(paymentIntentId: string) {
        try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error) {
            throw new Error(`Failed to retrieve payment intent: ${error.message}`);
        }
    }

    async handleWebhook(signature: string, payload: Buffer) {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret!
            );

            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    console.log('Payment succeeded:', paymentIntent.id);
                    // Handle successful payment
                    break;

                case 'payment_intent.payment_failed':
                    const failedPayment = event.data.object;
                    console.log('Payment failed:', failedPayment.id);
                    // Handle failed payment
                    break;

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            throw new Error(`Webhook error: ${error.message}`);
        }
    }
}