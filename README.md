
# 🔐 Secure Chat Application

A real-time chat application with **steganography** capabilities for secure communication.

## 📁 Project Structure

```
secure-app/
├── client/          # React Frontend (Vite)
├── server/          # Node.js + Express + Socket.IO
└── stego-service/   # Flask Steganography Microservice
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB (local or Atlas)

### 1️⃣ Start MongoDB (if using local)
```bash
mongod
```

### 2️⃣ Start Stego Service (Flask)
```bash
cd stego-service
pip install -r requirements.txt
python api.py
```
Flask runs on: `http://localhost:5001`

### 3️⃣ Start Node Server
```bash
cd server
npm install
npm start
```
Node runs on: `http://localhost:5000`

### 4️⃣ Start Client
```bash
cd client
npm install
npm run dev
```
Client runs on: `http://localhost:5173`

---

## 🔐 Steganography Features

### Text → Image
Hide secret text messages inside images with optional AES-256 encryption.

### Image → Image
Hide one image inside another image.

### Audio Steganography
Hide text messages inside WAV audio files.

---

## 📡 API Endpoints

### Chat APIs (Node.js - Port 5000)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/messages/users` | GET | Get all users |
| `/api/messages/:id` | GET | Get messages with user |
| `/api/messages/send/:id` | POST | Send message |

### Stego APIs (Flask - Port 5001)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/encode/text-image` | POST | Hide text in image |
| `/api/decode/text-image` | POST | Extract text from image |
| `/api/encode/image-image` | POST | Hide image in image |
| `/api/decode/image-image` | POST | Extract hidden image |
| `/api/encode/audio` | POST | Hide text in audio |
| `/api/decode/audio` | POST | Extract text from audio |
| `/api/capacity` | POST | Check image capacity |

### Node → Flask Bridge APIs (Port 5000)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stego/health` | GET | Check stego service |
| `/api/stego/encode/text-image` | POST | Encode text in image |
| `/api/stego/decode/text-image` | POST | Decode text from image |
| `/api/stego/encode/image-image` | POST | Encode image in image |
| `/api/stego/decode/image-image` | POST | Decode image from image |
| `/api/stego/encode/audio` | POST | Encode text in audio |
| `/api/stego/decode/audio` | POST | Decode text from audio |
| `/api/stego/capacity` | POST | Check capacity |

---

## 📊 Message Flow

### Sending a Secure Message

```
┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌─────────────┐
│ Client  │───▶│  Node   │───▶│ Flask Stego  │───▶│  Cloudinary │
│ (React) │    │ Server  │    │   Service    │    │   Storage   │
└─────────┘    └─────────┘    └──────────────┘    └─────────────┘
     │              │               │                    │
     │  1. Send     │  2. Forward   │   3. Encode        │
     │  secure msg  │  to Flask     │   message          │
     │              │◀──────────────│                    │
     │              │  4. Return    │                    │
     │              │  encoded img  │                    │
     │              │───────────────────────────────────▶│
     │              │  5. Upload encoded image           │
     │              │◀───────────────────────────────────│
     │              │  6. Get URL                        │
     │◀─────────────│                                    │
     │  7. Emit via │                                    │
     │  Socket.IO   │                                    │
```

### Receiving & Decoding

```
┌─────────┐    ┌─────────┐    ┌──────────────┐
│ Client  │───▶│  Node   │───▶│ Flask Stego  │
│ (React) │    │ Server  │    │   Service    │
└─────────┘    └─────────┘    └──────────────┘
     │              │               │
     │  1. Request  │  2. Forward   │
     │  decode      │  image/audio  │
     │              │◀──────────────│
     │              │  3. Return    │
     │◀─────────────│  decoded msg  │
     │  4. Display  │               │
     │  decoded     │               │
```

---

## 🛡️ Security Features

1. **AES-256 Encryption** - Messages encrypted before steganography
2. **Password Protection** - User-defined encryption passwords
3. **No Plaintext Storage** - Encoded messages only stored
4. **Auto-Cleanup** - Temporary files deleted after 5 minutes
5. **HTTPS Ready** - Use reverse proxy for production

---

## 🔧 Environment Variables

### Server (.env)
```env
MONGODB_URI=mongodb://localhost:27017
PORT=5000
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
STEGO_SERVICE_URL=http://localhost:5001
```

### Stego Service (.env)
```env
GEMINI_API_KEY=your-gemini-key  # Optional for AI features
```

---

## 📦 Dependencies

### Node Server
- express
- socket.io
- mongoose
- jsonwebtoken
- cloudinary
- cors

### Flask Stego Service
- flask
- flask-cors
- pillow
- cryptography
- python-dotenv

### React Client
- react
- vite
- socket.io-client
- axios
- react-hot-toast

---

## 🎯 Usage Guide

### Sending Secure Messages

1. Click the **🔐 Secure Send Panel** toggle
2. Choose steganography type:
   - **Text → Image**: Hide text in an image
   - **Image → Image**: Hide an image inside another
   - **Audio Stego**: Hide text in audio
3. Select your cover media
4. Enter your secret message
5. Enable encryption and set a password
6. Click **Send Securely**

### Decoding Received Messages

1. Secure messages show a **🔐 Secure** badge
2. Click **🔓 Decode** button
3. Enter password if encrypted
4. View decoded content

---

## 🚧 Future Improvements

- [ ] One-time-view images (auto-delete after viewing)
- [ ] Self-destruct messages
- [ ] Stego-detection resistance
- [ ] Hash verification
- [ ] Watermarking
- [ ] End-to-end encryption (E2EE)
- [ ] Video steganography

---

## 📜 License

MIT License
