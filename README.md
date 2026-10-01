# Simple AI Chatbot — Day 1 Task

A full-stack AI chatbot built to fulfill the Day 1 internship task requirements.

## What Was Built
- A web UI where users can send messages and receive AI responses.
- Backend API route (`/api/chat`) to send user inputs to Google Gemini securely.
- Multi-turn conversation context tracking.
- Loading indicator, basic error handling, and Markdown formatting for responses.

## Technology Used
- **Backend:** Node.js, Express.js
- **AI SDK:** `@google/genai` (Gemini API)
- **Frontend:** HTML, CSS, JavaScript (Vanilla), Marked.js (Markdown parser)
- **Environment Management:** `dotenv`

## How to Run It

1. **Clone the repository:**
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   cd "day1 chatbot"