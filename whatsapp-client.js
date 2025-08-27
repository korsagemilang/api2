const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const SESSION_PATH = './session';

class WhatsAppManager {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.qrCodeDisplayed = false;
    }

    async initialize() {
        try {
            logger.info('Initializing WhatsApp client...');
            
            // Create client with session persistence
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: SESSION_PATH
                }),
                puppeteer: {
                    headless: true,
                    executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor'
                    ]
                }
            });

            this.setupEventHandlers();
            
            // Start the client
            logger.info('Starting WhatsApp client initialization...');
            await this.client.initialize();
            
            return this.client;
        } catch (error) {
            logger.error('Failed to initialize WhatsApp client:', error.message);
            logger.error('Error stack:', error.stack);
            throw error;
        }
    }

    setupEventHandlers() {
        // QR Code event
        this.client.on('qr', (qr) => {
            if (!this.qrCodeDisplayed) {
                logger.info('QR Code received. Please scan with your WhatsApp mobile app:');
                console.log('\n=== SCAN QR CODE WITH WHATSAPP ===');
                qrcode.generate(qr, { small: true });
                console.log('=====================================\n');
                this.qrCodeDisplayed = true;
            }
        });

        // Authentication event
        this.client.on('authenticated', () => {
            logger.info('WhatsApp client authenticated successfully');
        });

        // Authentication failure event
        this.client.on('auth_failure', (msg) => {
            logger.error('Authentication failed:', msg);
        });

        // Ready event
        this.client.on('ready', () => {
            logger.info('WhatsApp client is ready!');
            this.isReady = true;
            this.logClientInfo();
        });

        // Disconnected event
        this.client.on('disconnected', (reason) => {
            logger.warn('WhatsApp client disconnected:', reason);
            this.isReady = false;
        });

        // Message received event
        this.client.on('message_create', (message) => {
            if (message.fromMe) {
                logger.info(`Message sent to ${message.to}: ${message.body}`);
            }
        });

        // Message received event
        this.client.on('message', (message) => {
            logger.info(`Message received from ${message.from}: ${message.body}`);
        });
    }

    async logClientInfo() {
        try {
            const info = this.client.info;
            logger.info(`Connected as: ${info.pushname} (${info.wid.user})`);
            logger.info(`Phone: ${info.wid.user}`);
            logger.info(`Platform: ${info.platform}`);
        } catch (error) {
            logger.error('Failed to get client info:', error);
        }
    }

    async sendMessage(phoneNumber, message) {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        try {
            // Format phone number for WhatsApp
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            const chatId = `${formattedNumber}@c.us`;
            
            // Check if number exists on WhatsApp
            const numberId = await this.client.getNumberId(formattedNumber);
            if (!numberId) {
                throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`);
            }

            // Send message
            const result = await this.client.sendMessage(chatId, message);
            
            logger.info(`Message sent successfully to ${phoneNumber}`);
            return {
                success: true,
                messageId: result.id._serialized,
                timestamp: result.timestamp,
                to: phoneNumber
            };
        } catch (error) {
            logger.error(`Failed to send message to ${phoneNumber}:`, error);
            throw error;
        }
    }

    async getChats() {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        try {
            const chats = await this.client.getChats();
            return chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                lastMessage: chat.lastMessage ? {
                    body: chat.lastMessage.body,
                    timestamp: chat.lastMessage.timestamp,
                    from: chat.lastMessage.from
                } : null
            }));
        } catch (error) {
            logger.error('Failed to get chats:', error);
            throw error;
        }
    }

    formatPhoneNumber(phoneNumber) {
        // Remove all non-numeric characters
        let formatted = phoneNumber.replace(/\D/g, '');
        
        // Add country code if missing (assuming international format)
        if (!formatted.startsWith('1') && formatted.length === 10) {
            formatted = '1' + formatted; // Add US country code
        }
        
        return formatted;
    }

    isClientReady() {
        return this.isReady && this.client;
    }

    async destroy() {
        if (this.client) {
            await this.client.destroy();
            this.isReady = false;
            logger.info('WhatsApp client destroyed');
        }
    }
}

// Export singleton instance
const whatsappManager = new WhatsAppManager();

async function initializeWhatsAppClient() {
    return await whatsappManager.initialize();
}

module.exports = {
    initializeWhatsAppClient,
    whatsappManager
};
