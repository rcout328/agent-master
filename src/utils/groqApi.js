import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: "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",
  dangerouslyAllowBrowser: true
});

export const callGroqApi = async (messages) => {
  try {
    console.log("Calling GROQ API with messages:", messages);

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama3-70b-8192",
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1,
      stream: false,
    });

    console.log("GROQ API Response:", completion);
    console.log("GROQ Content:", completion.choices[0]?.message?.content);

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling GROQ API:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to get AI analysis: ${error.message}`);
  }
}; 