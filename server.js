const express = require('express');
const cors = require('cors');
const { initializeWhatsAppClient } = require('./whatsapp-client');
const messageRoutes = require('./routes/messages');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global WhatsApp client instance
let whatsappClient = null;

// Initialize WhatsApp client on server start
async function startServer() {
    try {
        logger.info('Starting WhatsApp Web automation server...');
        
        // Initialize WhatsApp client
        whatsappClient = await initializeWhatsAppClient();
        
        // Make client available to routes
        app.locals.whatsappClient = whatsappClient;
        
        // Routes
        app.use('/api/messages', messageRoutes);
        
        // Health check endpoint
        app.get('/api/health', (req, res) => {
            const clientReady = whatsappClient && whatsappClient.info;
            res.json({
                status: 'running',
                whatsapp_connected: clientReady,
                timestamp: new Date().toISOString()
            });
        });
        
        // Root endpoint
        app.get('/', (req, res) => {
            res.json({
                message: 'WhatsApp Web Automation API',
                version: '1.0.0',
                endpoints: {
                    health: '/api/health',
                    send_message: 'POST /api/messages/send',
                    get_chats: 'GET /api/messages/chats'
                }
            });
        });
        
        // Error handling middleware
        app.use((err, req, res, next) => {
            logger.error('Server error:', err);
            res.status(500).json({
                error: 'Internal server error',
                message: err.message
            });
        });
        
        // 404 handler
        app.use((req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.path
            });
        });
        
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`Server running on http://0.0.0.0:${PORT}`);
            logger.info('WhatsApp Web automation API is ready');
        });
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    if (whatsappClient) {
        try {
            await whatsappClient.destroy();
            logger.info('WhatsApp client disconnected');
        } catch (error) {
            logger.error('Error disconnecting WhatsApp client:', error);
        }
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    if (whatsappClient) {
        try {
            await whatsappClient.destroy();
        } catch (error) {
            logger.error('Error disconnecting WhatsApp client:', error);
        }
    }
    process.exit(0);
});

// Start the server
startServer();
