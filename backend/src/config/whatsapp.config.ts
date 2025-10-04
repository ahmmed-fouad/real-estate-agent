/**
 * WhatsApp (Twilio) Configuration
 * Loads and validates WhatsApp-related environment variables
 */

import { config } from 'dotenv';

config();

export interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
  verifyToken: string;
  apiUrl: string;
  webhookPath: string;
}

/**
 * Get WhatsApp configuration from environment variables
 */
export const getWhatsAppConfig = (): WhatsAppConfig => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const apiUrl = process.env.WHATSAPP_API_URL || 'https://api.twilio.com/2010-04-01';
  const webhookPath = process.env.WEBHOOK_PATH || '/webhook/whatsapp';

  if (!accountSid) {
    throw new Error('TWILIO_ACCOUNT_SID is not set in environment variables');
  }

  if (!authToken) {
    throw new Error('TWILIO_AUTH_TOKEN is not set in environment variables');
  }

  if (!whatsappNumber) {
    throw new Error('TWILIO_WHATSAPP_NUMBER is not set in environment variables');
  }

  if (!verifyToken) {
    throw new Error('WHATSAPP_VERIFY_TOKEN is not set in environment variables');
  }

  return {
    accountSid,
    authToken,
    whatsappNumber,
    verifyToken,
    apiUrl,
    webhookPath,
  };
};

export const whatsappConfig = getWhatsAppConfig();

