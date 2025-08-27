# WhatsApp Web Automation API

Sistem automasi WhatsApp Web menggunakan Node.js dan library `whatsapp-web.js` dengan fitur API REST untuk mengirim pesan otomatis.

## Fitur Utama

✅ **Kirim pesan otomatis** - Mengirim pesan WhatsApp melalui API REST  
✅ **Session persisten** - Menyimpan sesi login tanpa perlu scan QR berulang  
✅ **API lengkap** - Endpoint untuk kirim pesan, cek status, dan ambil daftar chat  
✅ **Console interface** - Interface berbasis console yang sederhana  

## Instalasi dan Setup

### 1. Install Dependencies
```bash
npm install express cors whatsapp-web.js qrcode-terminal
```

### 2. Jalankan Server
```bash
node index.js
```

### 3. Scan QR Code
Saat pertama kali menjalankan, scan QR code yang muncul di console dengan aplikasi WhatsApp di smartphone Anda.

## Penggunaan API

### Base URL
```
http://localhost:5000
```

### 1. Cek Status Koneksi
```bash
GET /api/status
```

**Response:**
```json
{
  "connected": true,
  "info": {
    "name": "Nama Anda",
    "phone": "628123456789",
    "platform": "android"
  },
  "timestamp": "2025-08-27T09:01:13.219Z"
}
```

### 2. Kirim Pesan
```bash
POST /api/send-message
Content-Type: application/json

{
  "phone": "628123456789",
  "message": "Halo, ini pesan otomatis dari WhatsApp Web API!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "messageId": "3EB0123456789ABCDEF",
    "timestamp": 1640995200,
    "to": "628123456789"
  },
  "message": "Pesan berhasil dikirim"
}
```

### 3. Ambil Daftar Chat
```bash
GET /api/chats
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "628123456789@c.us",
      "name": "Nama Kontak",
      "isGroup": false,
      "unreadCount": 0,
      "lastMessage": {
        "body": "Pesan terakhir",
        "timestamp": 1640995200,
        "from": "628123456789@c.us"
      }
    }
  ],
  "count": 1
}
```

## Contoh Penggunaan dengan cURL

### Kirim Pesan Sederhana
```bash
curl -X POST http://localhost:5000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "628123456789",
    "message": "Halo dari WhatsApp API!"
  }'
```

### Cek Status Koneksi
```bash
curl http://localhost:5000/api/status
```

## Format Nomor Telepon

Nomor telepon dapat ditulis dalam berbagai format:
- `628123456789` (format standar dengan kode negara)
- `+628123456789` (dengan tanda plus)
- `08123456789` (akan otomatis ditambah kode negara Indonesia)

## Struktur Proyek

```
├── index.js              # File utama server (versi sederhana)
├── server.js             # Server lengkap dengan struktur modular
├── whatsapp-client.js    # WhatsApp client manager
├── routes/
│   └── messages.js       # API routes untuk pesan
├── middleware/
│   └── validation.js     # Middleware validasi
├── utils/
│   └── logger.js         # Sistem logging
├── session/              # Folder penyimpanan sesi (otomatis dibuat)
└── package.json          # Dependencies
```

## Session Management

- Sesi WhatsApp disimpan di folder `./session`
- Setelah scan QR pertama kali, sesi akan tersimpan otomatis
- Server restart tidak memerlukan scan QR ulang
- Jika ingin reset sesi, hapus folder `session`

## Error Handling

API akan mengembalikan error dalam format JSON:

```json
{
  "error": "Jenis error",
  "message": "Penjelasan detail error"
}
```

**Error Codes:**
- `400` - Bad Request (input tidak valid)
- `503` - Service Unavailable (WhatsApp belum siap)
- `500` - Internal Server Error

## Tips Penggunaan

1. **Pastikan WhatsApp Web tidak dibuka di browser lain** saat menggunakan API ini
2. **Gunakan nomor dengan format internasional** untuk hasil terbaik
3. **Monitor console output** untuk melihat status koneksi dan log pesan
4. **Backup folder session** jika diperlukan untuk restore login

## Troubleshooting

### QR Code Tidak Muncul
- Pastikan tidak ada instance WhatsApp Web lain yang berjalan
- Restart server dengan `node index.js`

### Gagal Kirim Pesan
- Pastikan nomor terdaftar di WhatsApp
- Cek status koneksi di `/api/status`
- Verifikasi format nomor telepon

### Session Expired
- Hapus folder `session`
- Restart server dan scan QR code baru

## Kontribusi

Proyek ini menggunakan:
- **Express.js** - Web framework
- **whatsapp-web.js** - WhatsApp Web API
- **qrcode-terminal** - QR code display
- **Puppeteer** - Browser automation

## License

MIT License - Gunakan dengan bebas untuk proyek pribadi maupun komersial.