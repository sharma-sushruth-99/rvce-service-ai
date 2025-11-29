
import { GoogleGenAI, Chat, GenerateContentResponse, FunctionDeclaration, Type, Part } from "@google/genai";
import { DB_SCHEMA } from '../constants';
import { Message, User } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("API_KEY environment variable not set. Using a placeholder. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || 'YOUR_API_KEY_HERE' });

export const systemInstruction = `You are "Service.AI", a friendly, professional, and empathetic customer support agent for a major e-commerce company specializing in computer accessories. 
Your goal is to assist users with their queries regarding products, orders, and feedback.

You have access to a database with the following schema to help you answer questions. Use the provided functions to query this database.
Database Schema:
${DB_SCHEMA}

// --- Persona & Tone ---
// - Always be courteous.
// - Use emojis to make the conversation feel more human and less robotic.
//   - For a happy or positive mood: 😊, 🙂, 😄
//   - When you understand or confirm something: 👍, ✔️
//   - If you're unsure or can't fulfill a request: 😅, 😐
//   - When ending a conversation: 👋, 😊

// --- Response Formatting ---
// - Structure your responses for clarity. Use newlines to break up long paragraphs. This is crucial for user readability, especially when they are frustrated.
// - Use Markdown for emphasis: **bold** for important information (like order numbers or product names) and _underline_ for highlighting key actions or dates.
// - Vary your emoji usage from the provided list to better match the context of the conversation.

// --- Core Rules ---
- You are communicating with an authenticated user. The user's details (UserID, FullName, Email) are provided with every query.
- **IMPORTANT**: Never ask the user for their UserID, name, email, order number, or any other personal or confidential information. You must use the information already provided to you.
- If a user asks about their order(s) or transactions, use the 'listUserOrders' or 'listUserTransactions' functions with their UserID to retrieve their history. Then, answer their question based on the retrieved data. For example, if they ask about "my order", you can refer to their most recent one.
- When a user asks a question, determine if you need to query the database. If so, call the appropriate function. Based on the function's return value, formulate a helpful and natural language response. Do not mention that you are calling a function or accessing a database. Just provide the answer seamlessly.

// --- Feedback Collection ---
// 1. Guidance: If a user expresses a desire to leave feedback, or if the conversation history indicates a feedback flow has started (e.g., the AI has just asked for a rating), guide them through the process.
// 2. Collection: First, ask for a numerical rating from 1 to 5. After they provide a rating, ask for a text description of their experience.
// 3. **Handling Refusal**: If the user declines to give feedback after you've asked (e.g., they say "I don't know", "no thanks", "idk", "not now"), your response MUST be a polite acknowledgement. For example: "Ok, no problem! Just let me know if you have any queries about your order status or finding products. 😊" Do not press them further for feedback.
// 4. Execution: Once you have BOTH a rating AND a description, you MUST call the 'submitFeedback' function with the user's ID, the rating, and the description.

// --- Feedback Confirmation ---
// After the 'submitFeedback' function is called and is successful, your confirmation message MUST be tailored to the rating provided by the user.
// - **If the rating is 1 or 2 stars:** First, express a sincere apology. For example: "I'm truly sorry to hear your experience wasn't up to par. Your feedback is incredibly important for us to improve." Then, confirm that the feedback is logged. Example: "I've logged your comments for our team to review immediately." Use empathetic and serious emojis, like 😐 or none at all. Avoid happy emojis.
// - **If the rating is 3 or 4 stars:** Thank them for the feedback and acknowledge that there's room for improvement. For example: "Thank you for your honest feedback! We appreciate you taking the time to share your thoughts. We'll use this to improve our service. I've passed it along to the team. 👍"
// - **If the rating is 5 stars:** Show enthusiasm and gratitude. For example: "That's wonderful to hear! We're so glad you had a great experience. Thank you so much for the amazing feedback! 😄 I've shared your kind words with the team. It means a lot to us! ✔️"

// --- Human Handoff Rules ---
// 1. Proactive Offer: If the user's message implies frustration, dissatisfaction, or anger (e.g., "this is not working", "I'm frustrated", "useless bot", "you're not helping"), your primary response MUST be to first acknowledge their frustration and then ask if they would like to speak to a human customer service representative. For example: 'I understand this is frustrating. Would you like me to connect you with our human customer service department?' Do not call any functions at this stage.
// 2. Explicit Request: If the user explicitly asks to speak to a human agent, representative, or person, OR if they respond positively (e.g., "yes", "please") after you have offered, you MUST call the 'contactHumanSupport' function with the user's first name (which you can extract from their 'FullName').
// 3. Handoff Message: After the 'contactHumanSupport' function call succeeds, your response to the user MUST be exactly: 'Sure {name}, i will contact the human customer service department right away. [CONTACT_SUPPORT]' replacing {name} with the user's first name. Do not add any other text.

// --- Off-Topic & Empathetic Responses ---
// If the user expresses personal feelings (e.g., sadness, joy, anger, fear) or discusses something unrelated to your e-commerce support role, do not state that you cannot help.
// Instead, provide a brief, empathetic acknowledgment of their feelings. Your main goal is to be a supportive presence while gently guiding the conversation back to your primary functions if appropriate.
// - Example (User is sad): "I'm feeling really down today." -> Your response: "I'm sorry to hear that you're feeling down. I hope things start looking up for you soon. If you need anything related to your account, just let me know. 😊"
// - Example (User is happy): "I'm so excited, I passed my exam!" -> Your response: "That's fantastic news! Congratulations on passing your exam! 😄 Let me know if there's anything I can help you with today."
// Acknowledge their state to show you've listened, and then pivot back to your role without being dismissive. This is more helpful than saying "I do not understand."

// --- Final Rule ---
// - If you cannot answer a question for any other reason, politely state that you can't provide that information and offer to help with supported topics (products, orders, feedback).
`;

// --- Mock Database Functions (Simulating backend calls) ---
const mockDb = {
    orders: [
        { OrderID: 1, UserID: 1, ProductID: 1, ProductName: 'PixelPhone Z10', Quantity: 1, UserAddress: '12 MG Road, Bangalore, KA, India', OrderPlaceDate: '15-10-2025', DeliveryDate: '18-10-2025' },
        { OrderID: 2, UserID: 2, ProductID: 6, ProductName: 'XG-900 Gaming Mouse', Quantity: 1, UserAddress: '45 Residency Road, Bangalore, KA, India', OrderPlaceDate: '20-10-2025', DeliveryDate: '22-10-2025' },
        { OrderID: 3, UserID: 2, ProductID: 8, ProductName: 'ThunderPro Cable (Thunderbolt 4)', Quantity: 2, UserAddress: '45 Residency Road, Bangalore, KA, India', OrderPlaceDate: '01-11-2025', DeliveryDate: '04-11-2025' },
    ],
    products: [
        { ProductID: 1, ProductName: 'PixelPhone Z10', Category: 'Phones', SubCategory: 'Smartphone', PriceUSD: 499.00, Description: '6.5" display, 128GB storage' },
        { ProductID: 2, ProductName: 'MightyBook Pro 15 (Gaming)', Category: 'Laptops', SubCategory: 'Gaming', PriceUSD: 1299.00, Description: 'RTX GPU, 16GB RAM' },
        { ProductID: 6, ProductName: 'XG-900 Gaming Mouse', Category: 'Mouses', SubCategory: 'Gaming', PriceUSD: 79.00, Description: 'High DPI gaming mouse' },
        { ProductID: 8, ProductName: 'ThunderPro Cable (Thunderbolt 4)', Category: 'Cables', SubCategory: 'Thunderbolt', PriceUSD: 39.00, Description: '1m Thunderbolt 4 cable' },
    ],
    transactions: [
        { TransactionID: 101, UserID: 1, PaymentMethod: 'Credit Card', AmountUSD: 499.00, TransactionDateTime: '15-10-2025 10:00:00' },
        { TransactionID: 102, UserID: 2, PaymentMethod: 'PayPal', AmountUSD: 79.00, TransactionDateTime: '20-10-2025 14:30:00' },
        { TransactionID: 103, UserID: 2, PaymentMethod: 'PayPal', AmountUSD: 78.00, TransactionDateTime: '01-11-2025 09:00:00' },
    ],
    feedback: [] as { UserID: number; Rating: number; Description: string }[],
};

const getOrderStatus = (orderId: number) => {
    const order = mockDb.orders.find(o => o.OrderID === orderId);
    return order ? `Order for ${order.ProductName} placed on ${order.OrderPlaceDate} is scheduled for delivery on ${order.DeliveryDate}.` : `Order with ID ${orderId} not found.`;
};

const listUserOrders = (userId: number) => {
    const userOrders = mockDb.orders.filter(o => o.UserID === userId);
    return userOrders.length > 0 ? userOrders : 'No orders found for this user.';
};

const findProducts = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const results = mockDb.products.filter(p => 
        p.ProductName.toLowerCase().includes(lowerQuery) ||
        p.Category.toLowerCase().includes(lowerQuery) ||
        p.Description.toLowerCase().includes(lowerQuery)
    );
    return results.length > 0 ? results : 'No products found matching that query.';
};

const submitFeedback = (userId: number, rating: number, description: string) => {
    mockDb.feedback.push({ UserID: userId, Rating: rating, Description: description });
    console.log(`Feedback submitted by UserID ${userId}: Rating=${rating}, Description="${description}"`);
    return { success: true, message: 'Thank you for your feedback!' };
};

const listUserTransactions = (userId: number) => {
    const userTransactions = mockDb.transactions.filter(t => t.UserID === userId);
    return userTransactions.length > 0 ? userTransactions : 'No transactions found for this user.';
};

const contactHumanSupport = (userName: string) => {
    console.log(`Human support requested for user: ${userName}. Contacting +91 0101010101.`);
    return { success: true, message: `Support contact initiated for ${userName}.` };
};

export const toolsMap = {
    getOrderStatus,
    listUserOrders,
    findProducts,
    submitFeedback,
    listUserTransactions,
    contactHumanSupport,
};

// --- Gemini Function Declarations ---
export const functionDeclarations: FunctionDeclaration[] = [
    {
        name: 'getOrderStatus',
        parameters: { type: Type.OBJECT, properties: { orderId: { type: Type.NUMBER, description: 'The ID of the order to check.' } }, required: ['orderId'] },
        description: "Get the status of a specific order by its ID."
    },
    {
        name: 'listUserOrders',
        parameters: { type: Type.OBJECT, properties: { userId: { type: Type.NUMBER, description: 'The ID of the user whose orders to list.' } }, required: ['userId'] },
        description: "List all orders for a given user."
    },
    {
        name: 'findProducts',
        parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'A search term for products (e.g., "gaming mouse", "laptop").' } }, required: ['query'] },
        description: "Find products based on a search query."
    },
    {
        name: 'submitFeedback',
        parameters: { 
            type: Type.OBJECT, 
            properties: { 
                userId: { type: Type.NUMBER },
                rating: { type: Type.NUMBER, description: 'A rating from 1 (bad) to 5 (excellent).' },
                description: { type: Type.STRING, description: 'The text content of the feedback.' }
            }, 
            required: ['userId', 'rating', 'description'] 
        },
        description: "Submit feedback about the service."
    },
    {
        name: 'listUserTransactions',
        parameters: { type: Type.OBJECT, properties: { userId: { type: Type.NUMBER, description: 'The ID of the user whose transactions to list.' } }, required: ['userId'] },
        description: "List all financial transactions for a given user."
    },
    {
        name: 'contactHumanSupport',
        parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING, description: "The user's first name." } }, required: ['name'] },
        description: "Use this function when the user explicitly asks to speak to a human, a person, an agent, or wants to contact the customer service department."
    }
];

export const createChatSession = (history: Message[]): Chat => {
    const chatHistory = history.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
    }));

    return ai.chats.create({
      model: 'gemini-2.5-flash',
      history: chatHistory,
      config: {
        systemInstruction,
        tools: [{functionDeclarations}],
      },
    });
};

export const sendMessage = async (session: Chat, prompt: string, user: User): Promise<string> => {
    if (!API_KEY) return "AI service is currently unavailable. API key is missing.";

    const fullPrompt = `(User Details: UserID=${user.id}, FullName=${user.fullName}, Email=${user.email})

    User query: ${prompt}`;

    try {
        let response: GenerateContentResponse = await session.sendMessage({ message: fullPrompt });

        // Loop handles multiple or sequential function calls until the model returns text.
        while (response.functionCalls && response.functionCalls.length > 0) {
            const functionCalls = response.functionCalls;
            const functionResponseParts: Part[] = [];

            for (const fc of functionCalls) {
                const functionName = fc.name as keyof typeof toolsMap;

                if (toolsMap[functionName]) {
                    const args = fc.args as any;
                    let result;
                    try {
                        switch (functionName) {
                            case 'getOrderStatus':
                                result = toolsMap.getOrderStatus(args.orderId);
                                break;
                            case 'listUserOrders':
                                result = toolsMap.listUserOrders(args.userId);
                                break;
                            case 'findProducts':
                                result = toolsMap.findProducts(args.query);
                                break;
                            case 'submitFeedback':
                                result = toolsMap.submitFeedback(args.userId, args.rating, args.description);
                                break;
                            case 'listUserTransactions':
                                result = toolsMap.listUserTransactions(args.userId);
                                break;
                            case 'contactHumanSupport':
                                result = toolsMap.contactHumanSupport(args.name);
                                break;
                            default:
                                result = { error: `Unknown function: ${functionName}` };
                        }
                    } catch (error: any) {
                         console.error(`Error executing function ${functionName}:`, error);
                         result = { error: `Function execution failed: ${error.message}` };
                    }
                    
                    functionResponseParts.push({
                      functionResponse: {
                        name: fc.name,
                        id: fc.id, 
                        response: {
                          result,
                        },
                      },
                    });
                } else {
                     functionResponseParts.push({
                      functionResponse: {
                        name: fc.name,
                        id: fc.id,
                        response: {
                          result: { error: `Function ${fc.name} is not available.` }
                        },
                      },
                    });
                }
            }

            // Send function responses back to the model
            response = await session.sendMessage({ message: functionResponseParts });
        }
        
        let textContent = "";
        try {
            textContent = response.text || "";
        } catch (e) {
            // response.text can throw if no text part is found.
        }

        if (textContent) {
            return textContent;
        }

        // Return empty string instead of throwing if content is blocked or empty but valid
        return "";

    } catch (error) {
        console.error("Detailed Gemini API Error in geminiService:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to get response from Gemini API.");
    }
};


export const generateChatTitle = async (prompt: string): Promise<string> => {
    if (!API_KEY) return "New Chat";

    try {
        const titlePrompt = `Generate a short, concise title (3-5 words) for a chat conversation that starts with this user message: "${prompt}". If the message is a simple greeting (like "hi", "hello", "how are you"), respond with only the text "New Chat". Do not use quotation marks in your response.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: titlePrompt,
        });

        const title = response.text || "New Chat";
        return title;
    } catch (error) {
        console.error("Detailed error generating chat title:", error);
        return "New Chat";
    }
};
