/**
 * WhatsApp (360dialog) Configuration
 * Loads and validates WhatsApp-related environment variables
 */

import { config } from 'dotenv';

config();

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  apiUrl: string;
  webhookPath: string;
}

/**
 * Get WhatsApp configuration from environment variables
 */
export const getWhatsAppConfig = (): WhatsAppConfig => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const apiUrl = process.env.WHATSAPP_API_URL || 'https://waba.360dialog.io/v1';
  const webhookPath = process.env.WEBHOOK_PATH || '/webhook/whatsapp';

  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not set in environment variables');
  }

  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set in environment variables');
  }

  if (!verifyToken) {
    throw new Error('WHATSAPP_VERIFY_TOKEN is not set in environment variables');
  }

  return {
    accessToken,
    phoneNumberId,
    verifyToken,
    apiUrl,
    webhookPath,
  };
};

export const whatsappConfig = getWhatsAppConfig();

