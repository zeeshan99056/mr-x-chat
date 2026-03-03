# Mr. Z's Multi-User Chat Application

A real-time chat application that allows multiple users to communicate across different devices and networks.

## Features
- Real-time messaging with Socket.IO
- User authentication with name entry
- Active users list
- Typing indicators
- Message timestamps
- Responsive black-themed design
- Cross-device compatibility

## Deployment on Render.com

1. Push this code to a GitHub repository
2. Go to [Render.com](https://render.com) and sign up
3. Click "New +" and select "Web Service"
4. Connect your GitHub repository
5. Configure:
   - Name: `mr-z-chat` (or your preferred name)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Click "Create Web Service"

Your app will be live at `https://your-app-name.onrender.com`

## Local Development

```bash
npm install
npm start