/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Model + system message settings for your chatbot behavior
const MODEL = "gpt-4o";
const SYSTEM_MESSAGE =
  "You are a friendly L'Oreal beauty assistant. Give short, beginner-friendly product and skincare tips.You stay on topic and respond with your best advice. Always be helpful and positive!";
const MAX_CONTEXT_MESSAGES = 12;

// Stores past user/assistant turns so the chatbot can remember context.
const conversationHistory = [];
let userName = "";

// Detect a name from simple patterns like "my name is Dylan" or "I'm Dylan".
function extractUserName(text) {
  const match = text.match(/(?:my name is|i am|i'm)\s+([a-z][a-z'-]*)/i);
  return match ? match[1] : "";
}

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  const detectedName = extractUserName(message);
  if (detectedName) {
    userName = detectedName.charAt(0).toUpperCase() + detectedName.slice(1);
  }

  conversationHistory.push({ role: "user", content: message });

  if (conversationHistory.length > MAX_CONTEXT_MESSAGES) {
    conversationHistory.splice(
      0,
      conversationHistory.length - MAX_CONTEXT_MESSAGES,
    );
  }

  // Cloudflare Worker URL
  const workerUrl = "https://lorbot.dylanmoen124.workers.dev/";

  chatWindow.textContent = "Thinking...";

  let personalizedSystemMessage = SYSTEM_MESSAGE;
  if (userName) {
    personalizedSystemMessage += ` The user's name is ${userName}. Use their name naturally when helpful.`;
  }

  try {
    // Send the user's message as a messages array
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: personalizedSystemMessage },
          ...conversationHistory,
        ],
      }),
    });

    const data = await response.json();

    // Read the assistant message from OpenAI-style response data
    const assistantReply = data.choices?.[0]?.message?.content;

    if (assistantReply) {
      chatWindow.textContent = assistantReply;
      conversationHistory.push({ role: "assistant", content: assistantReply });

      if (conversationHistory.length > MAX_CONTEXT_MESSAGES) {
        conversationHistory.splice(
          0,
          conversationHistory.length - MAX_CONTEXT_MESSAGES,
        );
      }
    } else {
      chatWindow.textContent =
        "No response text found. Check your Worker logs.";
    }
  } catch (error) {
    chatWindow.textContent =
      "Error connecting to your Worker. Check URL/CORS and try again.";
    console.error("Worker request failed:", error);
  }

  userInput.value = "";
});
