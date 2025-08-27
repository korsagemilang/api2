# Overview

This is a WhatsApp Web automation API built with Node.js and Express that enables programmatic messaging through WhatsApp Web. The application uses the whatsapp-web.js library to interface with WhatsApp Web, allowing users to send messages and retrieve chat information via REST API endpoints. The system is designed as a headless WhatsApp client that can be integrated into other applications for automated messaging capabilities.

The project now includes both a simplified single-file version (index.js) and a modular enterprise-ready version with full separation of concerns. The user specifically requested Indonesian language support and a console-based interface without web dashboard requirements.

# User Preferences

- Preferred communication style: Simple, everyday language in Indonesian  
- Prefers console-based interface over web dashboards
- Wants session persistence using file-based storage (session.json concept)
- Focuses on core automation features: send messages, API endpoints, session management

# System Architecture

## Backend Architecture
The application follows a modular Express.js architecture with clear separation of concerns:

- **Server Layer**: Express.js server (`server.js`) that handles HTTP requests and coordinates between components
- **WhatsApp Client Layer**: Custom WhatsApp manager class (`whatsapp-client.js`) that wraps whatsapp-web.js for session management and messaging operations
- **Route Layer**: RESTful API endpoints (`routes/messages.js`) for message operations and chat retrieval
- **Middleware Layer**: Input validation and request processing (`middleware/validation.js`)
- **Utility Layer**: Custom logging system (`utils/logger.js`) for application monitoring

## Authentication & Session Management
The system uses LocalAuth strategy from whatsapp-web.js for persistent WhatsApp Web sessions:
- Sessions are stored locally in `./session` directory
- QR code authentication for initial setup
- Automatic session restoration on server restart
- Headless browser operation with Puppeteer

## API Design
RESTful API structure with JSON responses:
- **POST /api/messages/send**: Send messages to WhatsApp contacts
- **GET /api/messages/chats**: Retrieve chat list
- **GET /api/health**: System health and connection status
- **GET /**: API information and available endpoints

## Error Handling & Validation
Comprehensive validation system for phone numbers and message content:
- Phone number format validation with multiple format support
- Message length limits (4096 characters maximum)
- Client readiness checks before operations
- Structured error responses with appropriate HTTP status codes

## Logging System
Custom logging implementation with dual output:
- Console logging with color-coded levels
- File-based logging with daily rotation
- JSON-structured log entries for parsing
- Multiple log levels (INFO, WARN, ERROR, DEBUG)

# External Dependencies

## Core Framework
- **Express.js 5.1.0**: Web framework for REST API endpoints and middleware
- **CORS 2.8.5**: Cross-origin resource sharing middleware for API access

## WhatsApp Integration
- **whatsapp-web.js 1.32.0**: Primary library for WhatsApp Web automation and messaging
- **@pedroslopez/moduleraid**: Internal dependency for WhatsApp Web protocol handling

## Development Tools
- **qrcode-terminal 0.12.0**: Terminal QR code display for WhatsApp authentication
- **Puppeteer**: Headless browser automation (bundled with whatsapp-web.js)

## Runtime Environment
- **Node.js**: JavaScript runtime environment
- **File System**: Local session storage and log file management
- **Process Environment**: Port configuration and runtime settings

The application is designed to run as a standalone service that can be deployed on any Node.js-compatible platform, with no external database requirements due to the use of local file-based session storage.