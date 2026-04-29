const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful customer service assistant for Carsgidi, a car rental platform. 

Key information about the service:
- Carsgidi offers vehicle rentals for personal and business use
- Customers can book vehicles online through the website
- Bookings can be modified or cancelled based on policies
- The platform supports SMS and email notifications
- Customers can view their bookings, pricing, and availability

Your responsibilities:
1. Answer frequently asked questions about vehicle rental policies
2. Help customers understand booking processes, dates, and pricing
3. Explain cancellation and modification policies
4. Guide customers through the platform features
5. Provide general support and direct to human support when needed

If a customer asks about something specific that requires accessing their booking data (like "what's my booking number"), offer to help but explain they should check their email or login to view that information.

Keep responses concise, friendly, and professional. If you don't know something, suggest they contact support or visit the website.

Carsgidi website: https://www.carsgidi.com`;

// POST /api/ai/chat
async function handleChat(req, res, next) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Message is required and must be a non-empty string",
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        message: "Chat service is not configured. Please contact support.",
      });
    }

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: message.trim(),
        },
      ],
    });

    const assistantMessage = response.content[0].text;

    res.json({
      message: assistantMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API error:", error.message || error);

    if (error.status === 401) {
      return res.status(500).json({
        message: "Authentication error with chat service. Please try again later.",
      });
    }

    next(error);
  }
}

module.exports = {
  handleChat,
};
