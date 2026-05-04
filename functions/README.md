# Chatbot Backend Deployment Guide

Since we added a secure backend (Firebase Functions) to handle the AI logic, you need to deploy it once.

## Prerequisites
- Ensure you have the Gemini API Key. (Get it from [Google AI Studio](https://aistudio.google.com/app/apikey))

## Steps to Deploy

Open your terminal in the project root (`d:\ONB App\Calender`) and run:

1.  **Login to Firebase** (if not already logged in):
    ```bash
    firebase login
    ```

2.  **Set your Gemini API Key:**
    Replace `YOUR_API_KEY` with your actual key.
    ```bash
    firebase functions:config:set gemini.key="YOUR_API_KEY"
    ```

3.  **Deploy the Functions:**
    ```bash
    firebase deploy --only functions
    ```

## Verification
Once deployed, refresh your app. The Chat bubble should appear in the bottom right.
- Click it and ask: *"Tuần này tôi có lịch không?"*
- If it replies, congratulations! Your AI Scheduler is live.
