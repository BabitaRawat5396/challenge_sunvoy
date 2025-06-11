# Sunvoy Challenge – Reverse Engineering Script

This Node.js script automates the process of extracting user information from the legacy web application [challenge.sunvoy.com](https://challenge.sunvoy.com).

## 🚀 Overview

This project:
- Logs into the Sunvoy challenge web app using the provided credentials
- Calls the internal APIs used by the frontend
- Fetches and saves a list of users to `users.json`
- Adds the currently authenticated user to the same JSON file
- Reuses session credentials across runs if still valid

---

## 🧰 Tech Stack

- Node.js (LTS)
- TypeScript
- Axios
- Cheerio (for DOM parsing if needed)
- `axios-cookiejar-support` and `tough-cookie` for session persistence

---

## 📦 Installation

```bash
git clone https://github.com/your-username/sunvoy-challenge.git
cd sunvoy-challenge
npm install
