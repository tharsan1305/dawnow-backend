const OpenAI = require('openai');

// Initialize OpenAI/OpenRouter safely
let openai = null;
if (process.env.OPENAI_API_KEY) {
    const isOpenRouter = process.env.OPENAI_API_KEY.startsWith('sk-or-');
    
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        ...(isOpenRouter && { baseURL: "https://openrouter.ai/api/v1" })
    });
}

// @desc    Process AI Chat
// @route   POST /api/chat
// @access  Private (Registered Users)
const getAIChatResponse = async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        const role = req.user.role; // admin or staff

        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({ 
                message: 'AI service is currently unavailable. Please configure the API key in the system environment.' 
            });
        }

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // --- AI SECURITY HARDENING ---
        const malPatterns = [
            /<script/i, /javascript:/i, /onclick/i, /onload/i, /onerror/i,
            /bypass/i, /ignore previous/i, /hacking/i, /exploit/i, /brute force/i,
            /sql injection/i, /password/i, /secret key/i, /crack/i
        ];

        const isMalicious = malPatterns.some(pattern => pattern.test(message));

        if (isMalicious) {
            return res.status(403).json({ 
                reply: "⚠️ SECURITY ALERT: Your query contains restricted keywords or patterns. For system safety, I cannot process hacking, bypassing, or script-related requests. Please stay on the topic of research and development." 
            });
        }
        // ----------------------------

        // Define system prompt based on user role
        let systemPrompt = "You are a friendly and helpful assistant for the Center for Research and Development (CFRD) at JJ College of Engineering and Technology. Explain research concepts simply.";
        
        if (role === 'admin') {
            systemPrompt = "You are a technical expert assistant for the CFRD system administration. Provide deep, analytical, and system-level research management answers.";
        }

        // Prepare context
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-5), // Only last 5 messages for context to save tokens
            { role: 'user', content: message }
        ];

        const isOpenRouter = process.env.OPENAI_API_KEY.startsWith('sk-or-');

        const completion = await openai.chat.completions.create({
            model: isOpenRouter ? "openai/gpt-3.5-turbo" : "gpt-3.5-turbo",
            messages,
            max_tokens: 1000,
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;

        res.json({ reply });

    } catch (err) {
        console.error('[AI CHAT ERROR]', err);
        
        if (err.status === 401) {
            return res.status(500).json({ message: 'System configuration error: Invalid AI API Key.' });
        }

        if (err.status === 429) {
            return res.status(429).json({ message: 'AI rate limit reached. Please try again after some time.' });
        }

        res.status(500).json({ message: 'Internal AI processing error. Please try again later.' });
    }
};

module.exports = {
    getAIChatResponse
};
