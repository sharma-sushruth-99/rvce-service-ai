# Service.AI - Customer Support Chatbot

This project is a submission for the "RVCE-Boston: AI and Business Solutions" internship program. It's a web application demonstrating an AI-powered chatbot, "Service.AI," designed to handle customer support queries for a simulated e-commerce company specializing in computer accessories.

## Project Goal

The primary objective is to showcase how a Large Language Model (LLM) like Google's Gemini can be integrated into a business solution to:
- Understand and respond to customer queries in a natural, empathetic way.
- Interact with a simulated database to retrieve specific information like order status and product details.
- Perform actions based on user requests, such as submitting feedback.
- Analyze user sentiment implicitly to provide better service.

This application is a **simulation only** and does not involve real transactions or a live e-commerce backend.

## Features

- **Conversational AI:** A responsive chat interface powered by the Gemini API.
- **AI-Generated Chat Titles:** New chats are automatically given a concise title by the AI based on the user's initial query, making conversations easy to identify later.
- **Database Simulation:** The AI uses a predefined database schema to answer questions, simulating real-world data retrieval. This is achieved through **Function Calling**.
- **User-Specific Context:** The chatbot is aware of the logged-in user ("Rahul Singh" for this demo) and can pull their specific order history and details.
- **Chat History:** Conversations are saved and can be revisited. New chats can be started at any time.
- **Sentiment Analysis (Implicit):** The AI is prompted to be empathetic, demonstrating its ability to handle customer interactions with appropriate sentiment.
- **Theming:** The UI supports both light and dark modes for user comfort.

## Keyboard Shortcuts

The application includes a few handy keyboard shortcuts to improve accessibility and speed of use:

| Shortcut | Action |
| --- | --- |
| `Alt` + `C` | Collapse/Expand Sidebar |
| `Alt` + `N` | Start a New Chat |
| `Enter` | Send Message |
| `Shift`+`Enter`| Newline in Message Box |

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Model:** gemini-2.5-pro (via the `@google/genai` SDK)
- **Database:** A mock in-memory database simulating a MySQL backend. The schema is provided as context to the AI.

## AI Architecture

1.  **UI/UX (React & Tailwind):** The user interacts with a clean, modern chat interface.
2.  **State Management (React Context):** Manages application state like theming and the current user session.
3.  **AI Service (`geminiService.ts`):**
    *   This is the core of the AI logic. It initializes the Gemini model with a **system instruction** that defines its persona (Service.AI) and gives it the database schema.
    *   It defines a set of available tools (**Function Declarations**) that the AI can use to "query" the mock database (e.g., `getOrderStatus`, `findProducts`).
    *   When a user sends a message, the service sends it to the Gemini API.
    *   The Gemini model analyzes the prompt and, if necessary, returns a `FunctionCall` instead of a text response.
    *   The application executes the corresponding mock database function and sends the result back to the model.
    *   The model then uses this result to formulate a natural language response for the user.

## Getting Started
To run this project directly without any need to download the code, go to this link:
[{https://ai.studio/apps/drive/1a4kdCrZb0BSBd19v3m0H4jnaCbZuHqVT}]

To run this project locally, you will need to have Node.js and npm installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/sharma-sushruth-99/rvce-service-ai
    cd rvce-service-ai
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project and add your Google Gemini API key:
    ```
    API_KEY=YOUR_GEMINI_API_KEY
    ```

4.  **Run the application:**
    ```bash
    npm start
    ```
    This will start the development server, and you can view the application in your browser.

## How the Simulation Works

The application bypasses a traditional login screen and automatically starts a session for a pre-defined user, **Rahul Singh**, whose data exists in the mock database. This allows the demonstration to immediately focus on the AI's capabilities. You can ask questions like:
- "Where is my order?"
- "What laptops do you have?"
- "I want to return the mouse." (to see how it handles policy questions)
- "The service was great, thanks!" (to test feedback submission)
