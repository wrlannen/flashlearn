const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Global request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (req.method === 'POST') {
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000, // 30 seconds timeout
});

// Process-level error handling
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    // Keep running if possible, or exit cleanly
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

app.post('/api/generate-cards', async (req, res) => {
    console.log('Received request to /api/generate-cards');
    try {
        const { topic, context } = req.body;
        console.log('Request body topic:', topic);
        if (context) console.log(`Context provided with ${context.length} existing cards.`);

        if (!topic) {
            console.warn('Topic is missing in request body');
            return res.status(400).json({ error: 'Topic is required' });
        }

        console.log('Checking OpenAI API Key...');
        if (!process.env.OPENAI_API_KEY) {
            console.error('OPENAI_API_KEY is not set in environment variables');
            throw new Error('OPENAI_API_KEY missing');
        }

        const model = process.env.OPENAI_MODEL || "gpt-4o";
        console.log(`Calling OpenAI API with model: ${model}`);

        let contextString = "";
        if (context && Array.isArray(context) && context.length > 0) {
            contextString = `\n\nIMPORTANT: The student has already studied the following concepts. Do NOT generate cards for these exact concepts again. Instead, focus on related but new concepts, advanced details, or different aspects of the topic:\n${context.join(', ')}`;
        }

        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an expert tutor. Create 10 comprehensive, educational flashcards to help a student learn the requested topic in depth.
                    
                    For each card:
                    1. "front": A clear, thought-provoking question or concept name.
                    2. "back": A detailed explanation (2-4 sentences) that fully answers the question or explains the concept. Avoid brief one-line answers.
                    3. "code": (Optional) If the topic involves programming or technical syntax, provide a relevant code snippet here. If not applicable, leave this field null or empty string.

                    Return valid JSON with exactly this structure:
                    {
                        "flashcards": [
                            {
                                "front": "Question",
                                "back": "Detailed Answer",
                                "code": "const example = 'optional code snippet';"
                            }
                        ]
                    }
                    
                    Do not include any markdown formatting in the JSON values, except for the 'code' field which should be plain text code (no backticks).${contextString}`
                },
                {
                    role: "user",
                    content: `Generate flashcards for the topic: ${topic}`
                }
            ],
            response_format: { type: "json_object" }
        });

        console.log('OpenAI API call successful');

        if (!completion.choices || completion.choices.length === 0) {
            console.error('Unexpected OpenAI response structure: choices array missing or empty', JSON.stringify(completion, null, 2));
            throw new Error('Invalid response from OpenAI');
        }

        // Handle potential markdown code blocks in response if model is chatty, though system prompt forbids it.
        let content = completion.choices[0].message.content;
        console.log('Raw content received from OpenAI:', content);

        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        console.log('Content after cleaning markdown:', content);

        console.log('Attempting to parse JSON content...');
        const parsedContent = JSON.parse(content);

        // Extract array from the expected structure
        let flashcards = [];

        if (Array.isArray(parsedContent)) {
            flashcards = parsedContent;
        } else if (parsedContent.flashcards && Array.isArray(parsedContent.flashcards)) {
            flashcards = parsedContent.flashcards;
        } else if (parsedContent.cards && Array.isArray(parsedContent.cards)) {
            flashcards = parsedContent.cards;
        } else {
            // Fallback: if it's a single object that looks like a card, wrap it
            console.warn('Unknown JSON structure, attempting to wrap single object');
            flashcards = [parsedContent];
        }

        if (!Array.isArray(flashcards)) {
            // Second fallback: force array if something extremely weird happened
            flashcards = [];
        }

        console.log(`Successfully parsed ${flashcards.length} flashcards`);

        res.json(flashcards);

    } catch (error) {
        console.error('CRITICAL ERROR in /api/generate-cards:', error);
        if (error.response) {
            console.error('OpenAI API Response Error Data:', error.response.data);
            console.error('OpenAI API Response Status:', error.response.status);
        }
        res.status(500).json({ error: 'Failed to generate flashcards', details: error.message });
    }
});

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`ERROR: Port ${port} is already in use!`);
        console.error(`Please kill the process running on port ${port} or check your .env file.`);
        process.exit(1);
    } else {
        console.error('Server error:', e);
    }
});
