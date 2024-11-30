const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

export const callGeminiApi = async (messages) => {
  try {
    console.log("Calling Gemini API with messages:", messages);

    // Format messages for Gemini API
    const formattedContent = {
      contents: [{
        parts: [{
          text: messages[1].content // Using the user message content
        }]
      }]
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedContent)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Gemini API Response:", data);

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const content = data.candidates[0]?.content?.parts?.[0]?.text;
    console.log("Gemini Content:", content);

    if (!content) {
      throw new Error('Empty response from Gemini API');
    }

    return content;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to get AI analysis: ${error.message}`);
  }
}; 