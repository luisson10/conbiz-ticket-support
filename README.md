# Conbiz Ticket Support Platform

A bidirectional ticket support platform integrated with Linear, built with Next.js and Tailwind CSS.

## Getting Started

1.  **Environment Setup**:
    Create a `.env.local` file in the root directory and add your Linear API Key:
    ```bash
    LINEAR_API_KEY=lin_api_...
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

4.  **Admin API Explorer**:
    Visit `http://localhost:3000/admin/linear-explorer` to test the Linear connection and view your workspace structure.

5.  **Webhook Development (Local)**:
    To test bidirectional sync locally, use a tunnel like [ngrok](https://ngrok.com/):
    
    a. Install and run ngrok:
    ```bash
    ngrok http 3000
    ```
    b. Copy the HTTPS URL (e.g., `https://xxxx.ngrok-free.app`).
    c. In Linear Settings -> API -> Webhooks, create a new webhook:
       - URL: `https://xxxx.ngrok-free.app/api/webhooks/linear`
       - Events: Select 'Issues', 'Comments', 'Customer Requests'
    d. Copy the **Signing Secret** from Linear and add to `.env.local`:
    ```bash
    LINEAR_WEBHOOK_SECRET=lin_wh_...
    ```

## Tech Stack
-   **Framework**: Next.js 15 (App Router)
-   **Styling**: Tailwind CSS v4, Font: Plus Jakarta Sans
-   **Integration**: Linear SDK

## Arquitectura y Flujos
-   Documento completo: `docs/arquitectura-sistemas.md`

## Design System
-   Primary Color: `#FC6F5D`
-   Design tokens are configured in `app/globals.css`.
