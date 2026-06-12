const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_BASE_URL = process.env.DIFY_BASE_URL || "https://api.dify.ai/v1";

const conversations = new Map();

app.get("/", (req, res) => {
  res.send("KTE-AI Facebook Messenger bot is running.");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  console.log("POST /webhook received:", JSON.stringify(req.body));

  const body = req.body;

  if (body.object !== "page") {
    console.log("Ignored webhook object:", body.object);
    return res.sendStatus(404);
  }

  res.status(200).send("EVENT_RECEIVED");

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender && event.sender.id;
      if (!senderId) continue;

      if (!event.message || !event.message.text) continue;

      const userText = event.message.text.trim();
      if (!userText) continue;

      try {
        await sendTypingOn(senderId);
        const answer = await askDify(senderId, userText);
        await sendFacebookMessage(senderId, answer || "Xin lỗi, KTE-AI chưa có câu trả lời phù hợp.");
      } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        await sendFacebookMessage(
          senderId,
          "Xin lỗi, hệ thống KTE-AI đang bận hoặc chưa kết nối được. Vui lòng thử lại sau."
        );
      }
    }
  }
});

async function askDify(userId, text) {
  const conversationId = conversations.get(userId);

  const payload = {
    inputs: {},
    query: text,
    response_mode: "blocking",
    user: userId
  };

  if (conversationId) payload.conversation_id = conversationId;

  const response = await axios.post(`${DIFY_BASE_URL}/chat-messages`, payload, {
    headers: {
      Authorization: `Bearer ${DIFY_API_KEY}`,
      "Content-Type": "application/json"
    },
    timeout: 60000
  });

  const data = response.data;

  if (data.conversation_id) {
    conversations.set(userId, data.conversation_id);
  }

  return data.answer || "";
}

async function sendTypingOn(recipientId) {
  await axios.post(
    `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: recipientId },
      sender_action: "typing_on"
    }
  );
}

async function sendFacebookMessage(recipientId, text) {
  const chunks = splitMessage(text, 1800);

  for (const chunk of chunks) {
    await axios.post(
      `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text: chunk }
      }
    );
  }
}

function splitMessage(text, maxLen) {
  if (!text) return [""];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf("\n", maxLen);
    if (cut < maxLen * 0.5) cut = remaining.lastIndexOf(" ", maxLen);
    if (cut < maxLen * 0.5) cut = maxLen;

    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining.length) chunks.push(remaining);
  return chunks;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KTE-AI Messenger webhook is running on port ${PORT}`);
});
