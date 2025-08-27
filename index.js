const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

// Konfigurasi server
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Variable untuk menyimpan client WhatsApp
let client;
let isReady = false;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectTimeout = null;
let isReconnecting = false;

// Inisialisasi WhatsApp client
async function initializeWhatsApp() {
    console.log('🚀 Memulai WhatsApp Web automation...');

    // 🔧 Hapus file lock biar Chromium bisa jalan
    const lockFile = path.join(__dirname, 'session', 'Default', 'SingletonLock');
    if (fs.existsSync(lockFile)) {
        try {
            fs.unlinkSync(lockFile);
            console.log('🧹 File SingletonLock dihapus');
        } catch (err) {
            console.log('⚠️ Gagal hapus SingletonLock:', err.message);
        }
    }

    // Cleanup sebelum restart
    if (client) {
        try {
            await client.destroy();
        } catch (error) {
            console.log('⚠️ Error saat cleanup:', error.message);
        }
    }

    // Membuat client dengan session persisten
    client = new Client({
            authStrategy: new LocalAuth({
                dataPath: path.join(__dirname, 'session'),
                clientId: "bot1"
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
                '--disable-gpu'
            ],
            timeout: 120000
        }
    });

    // Event handler untuk QR code
    client.on('qr', (qr) => {
        console.log('\n📱 Silakan scan QR code dengan WhatsApp Anda:');
        console.log('==========================================');
        qrcode.generate(qr, { small: true });
        console.log('==========================================\n');
    });

    // Event handler untuk autentikasi berhasil
    client.on('authenticated', () => {
        console.log('✅ Autentikasi WhatsApp berhasil!');
    });

    // Event handler untuk gagal autentikasi
    client.on('auth_failure', (msg) => {
        console.log('❌ Gagal autentikasi:', msg);
    });

    // Event handler ketika client siap
    client.on('ready', () => {
        console.log('🎉 WhatsApp client siap digunakan!');
        isReady = true;
        reconnectAttempts = 0; // Reset counter saat sukses connect
        isReconnecting = false;
        
        // Clear timeout jika ada
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        
        // Tampilkan info akun
        if (client.info) {
            console.log(`📞 Terhubung sebagai: ${client.info.pushname} (${client.info.wid.user})`);
        }
        
        // Start keepalive
        startKeepAlive();
    });

    // Event handler untuk disconnect
    client.on('disconnected', (reason) => {
        console.log('⚠️ WhatsApp terputus:', reason);
        isReady = false;
        
        // Auto-reconnect dengan batasan attempts
        if (!isReconnecting && reconnectAttempts < maxReconnectAttempts) {
            scheduleReconnect(reason);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('❌ Maksimum reconnect attempts tercapai. Session tersimpan, restart manual diperlukan.');
        }
    });

    // Event handler untuk pesan yang dikirim
    client.on('message_create', (message) => {
        if (message.fromMe) {
            console.log(`📤 Pesan terkirim ke ${message.to}: ${message.body}`);
        }
    });

    // Error handling untuk client
    client.on('change_state', (state) => {
        console.log('📱 Status WhatsApp:', state);
    });
    
    client.on('loading_screen', (percent, message) => {
        console.log(`⏳ Loading: ${percent}% - ${message}`);
    });

    // Mulai client
    await client.initialize();
}

// Fungsi untuk schedule reconnect
function scheduleReconnect(reason) {
    if (isReconnecting) return;
    
    isReconnecting = true;
    reconnectAttempts++;
    
    // Delay progresif: 5s, 15s, 30s, 60s, 120s
    const delays = [5000, 15000, 30000, 60000, 120000];
    const delay = delays[Math.min(reconnectAttempts - 1, delays.length - 1)];
    
    console.log(`🔄 Mencoba reconnect dalam ${delay/1000} detik (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
    console.log(`📋 Alasan disconnect: ${reason}`);
    
    reconnectTimeout = setTimeout(async () => {
        try {
            console.log('🔄 Memulai reconnect...');
            await initializeWhatsApp();
        } catch (error) {
            console.log('❌ Reconnect gagal:', error.message);
            isReconnecting = false;
            
            if (reconnectAttempts < maxReconnectAttempts) {
                scheduleReconnect('reconnect_failed');
            }
        }
    }, delay);
}

// Fungsi keepalive untuk menjaga koneksi
function startKeepAlive() {
    // Ping WhatsApp setiap 5 menit untuk menjaga koneksi aktif
    setInterval(async () => {
        if (isReady && client) {
            try {
                // Simple ping dengan get state
                await client.getState();
                console.log('💚 Keepalive: Koneksi WhatsApp aktif');
            } catch (error) {
                console.log('⚠️ Keepalive failed:', error.message);
            }
        }
    }, 5 * 60 * 1000); // 5 menit
}

// Fungsi untuk mengirim pesan
async function sendMessage(phoneNumber, message) {
    if (!isReady) {
        throw new Error('WhatsApp client belum siap');
    }

    try {
        // Format nomor telepon (hapus karakter non-digit)
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        const chatId = `${cleanNumber}@c.us`;
        
        // Cek apakah nomor terdaftar di WhatsApp
        const numberId = await client.getNumberId(cleanNumber);
        if (!numberId) {
            throw new Error(`Nomor ${phoneNumber} tidak terdaftar di WhatsApp`);
        }

        // Kirim pesan
        const result = await client.sendMessage(chatId, message);
        console.log(`✅ Pesan berhasil dikirim ke ${phoneNumber}`);
        
        return {
            success: true,
            messageId: result.id._serialized,
            timestamp: result.timestamp,
            to: phoneNumber
        };
    } catch (error) {
        console.error(`❌ Gagal mengirim pesan ke ${phoneNumber}:`, error.message);
        throw error;
    }
}

// API Routes

// Endpoint untuk mengirim pesan
app.post('/api/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        // Validasi input
        if (!phone || !message) {
            return res.status(400).json({
                error: 'Nomor telepon dan pesan harus diisi'
            });
        }

        if (!isReady) {
            return res.status(503).json({
                error: 'WhatsApp client belum siap',
                message: 'Silakan tunggu koneksi WhatsApp atau scan QR code'
            });
        }

        const result = await sendMessage(phone, message);
        
        res.json({
            success: true,
            data: result,
            message: 'Pesan berhasil dikirim'
        });
        
    } catch (error) {
        console.error('Error API send message:', error);
        
        if (error.message.includes('tidak terdaftar di WhatsApp')) {
            return res.status(400).json({
                error: 'Nomor tidak valid',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Gagal mengirim pesan',
            message: error.message
        });
    }
});

// Endpoint untuk mendapatkan status koneksi
app.get('/api/status', (req, res) => {
    res.json({
        connected: isReady,
        reconnecting: isReconnecting,
        reconnectAttempts: reconnectAttempts,
        maxReconnectAttempts: maxReconnectAttempts,
        info: isReady && client.info ? {
            name: client.info.pushname,
            phone: client.info.wid.user,
            platform: client.info.platform
        } : null,
        timestamp: new Date().toISOString()
    });
});

// Endpoint untuk manual reconnect
app.post('/api/reconnect', async (req, res) => {
    try {
        if (isReconnecting) {
            return res.status(400).json({
                error: 'Reconnect sedang berlangsung',
                reconnectAttempts: reconnectAttempts
            });
        }
        
        console.log('🔄 Manual reconnect dipicu via API');
        reconnectAttempts = 0; // Reset counter untuk manual reconnect
        
        await initializeWhatsApp();
        
        res.json({
            success: true,
            message: 'Reconnect berhasil dimulai'
        });
        
    } catch (error) {
        console.error('Error manual reconnect:', error);
        res.status(500).json({
            error: 'Gagal melakukan reconnect',
            message: error.message
        });
    }
});

// Endpoint untuk mendapatkan daftar chat
app.get('/api/chats', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({
                error: 'WhatsApp client belum siap'
            });
        }

        const chats = await client.getChats();
        const chatList = chats.map(chat => ({
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
        
        res.json({
            success: true,
            data: chatList,
            count: chatList.length
        });
        
    } catch (error) {
        console.error('Error getting chats:', error);
        res.status(500).json({
            error: 'Gagal mendapatkan daftar chat',
            message: error.message
        });
    }
});

// Endpoint root - informasi API
app.get('/', (req, res) => {
    res.json({
        name: 'WhatsApp Web Automation API',
        version: '1.0.0',
        description: 'API untuk mengirim pesan WhatsApp otomatis',
        endpoints: {
            status: 'GET /api/status - Cek status koneksi',
            send_message: 'POST /api/send-message - Kirim pesan',
            get_chats: 'GET /api/chats - Dapatkan daftar chat',
            reconnect: 'POST /api/reconnect - Manual reconnect'
        },
        usage: {
            send_message: {
                method: 'POST',
                url: '/api/send-message',
                body: {
                    phone: '628123456789',
                    message: 'Halo, ini pesan otomatis!'
                }
            }
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint tidak ditemukan',
        path: req.path
    });
});

// Fungsi untuk shutdown graceful
async function gracefulShutdown() {
    console.log('\n🔄 Menutup server...');
    if (client) {
        try {
            await client.destroy();
            console.log('✅ WhatsApp client terputus');
        } catch (error) {
            console.error('❌ Error saat menutup WhatsApp client:', error);
        }
    }
    process.exit(0);
}

// Handle process signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Mulai server
async function startServer() {
    try {
        // Inisialisasi WhatsApp client
        await initializeWhatsApp();
        
        // Mulai HTTP server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🌐 Server berjalan di http://0.0.0.0:${PORT}`);
            console.log('📋 API Endpoints:');
            console.log(`   GET  ${PORT}/api/status - Status koneksi`);
            console.log(`   POST ${PORT}/api/send-message - Kirim pesan`);
            console.log(`   GET  ${PORT}/api/chats - Daftar chat\n`);
        });
        
    } catch (error) {
        console.error('❌ Gagal memulai server:', error);
        
        // Delay sebelum restart untuk mencegah loop
        console.log('⏳ Menunggu 30 detik sebelum restart otomatis...');
        setTimeout(() => {
            console.log('🔄 Restart server...');
            process.exit(1);
        }, 30000);
    }
}

// Jalankan server
startServer();