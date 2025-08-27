# WhatsApp API Deployment Guide

## Deployment ke Replit (Online 24/7)

### 1. Deploy dengan Autoscale (Recommended)
```bash
# Klik tombol "Deploy" di Replit workspace
# Pilih "Autoscale Deployment"
# Run command: node index.js
# Port: 5000
```

**Keuntungan Autoscale:**
- Otomatis adjust resources sesuai traffic
- Hemat biaya saat idle
- Scale up otomatis saat ramai
- Custom domain tersedia

### 2. Deploy dengan Reserved VM
```bash
# Pilih "Reserved VM Deployment" 
# Untuk aplikasi yang perlu jalan terus
# Dedicated resources
# Biaya tetap dan predictable
```

## Akses dari Server Lain

### Setelah Deploy:
```bash
# URL akan berubah dari localhost ke:
https://your-app-name.replit.app

# Contoh endpoint:
GET  https://your-app-name.replit.app/api/status
POST https://your-app-name.replit.app/api/send-message
GET  https://your-app-name.replit.app/api/chats
```

### Test dari Server Lain:
```bash
# Cek status
curl https://your-app-name.replit.app/api/status

# Kirim pesan
curl -X POST https://your-app-name.replit.app/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "628123456789",
    "message": "Test dari server lain!"
  }'
```

## Environment Variables untuk Production

### Set secrets untuk deployment:
```bash
# Di Replit Secrets (untuk deployment):
NODE_ENV=production
WHATSAPP_SESSION_PATH=/tmp/session
PORT=5000
```

## Monitoring & Logs

### Setelah deploy:
- Monitor via Replit Dashboard
- View logs real-time
- Health checks otomatis
- Restart otomatis jika crash

## Custom Domain (Opsional)

### Untuk domain profesional:
```bash
# Setup custom domain di deployment settings
# Contoh: api.tokosaya.com
# SSL certificate otomatis
```

## Backup Session

### Penting untuk production:
```bash
# Session WhatsApp tersimpan di /tmp/session
# Backup berkala session data
# Restore jika diperlukan deployment baru
```

## Scaling Considerations

### Untuk traffic tinggi:
- Autoscale bisa handle multiple instances
- Rate limiting sudah ada di code
- Monitor usage dan adjust resources