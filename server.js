import express from "express";
import dotenv from "dotenv";
import path from "path";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

dotenv.config();

const port = 3000;
const app = express();

const __dirname = path.resolve();

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash",
  temperature: 0.7,
  maxOutputTokens: 2048,
  apiKey: process.env.GOOGLE_API_KEY,
});

// Tool: Restaurant Menu Tool
const getMenuTool = new DynamicStructuredTool({
  name: "getMenuTool",
  description:
    "Returns today's restaurant menu for breakfast, lunch, or dinner.",
  schema: z.object({
    category: z
      .string()
      .describe("Type of food: breakfast, lunch, or dinner"),
  }),

  func: async ({ category }) => {
    const menus = {
      breakfast: "Bread, Paratha, Chai",
      lunch: "Rice, Dal, Chicken Curry",
      dinner: "Roti, Paneer Curry, Salad",
    };

    return (
      menus[category.toLowerCase()] ||
      "Menu not found for the given category."
    );
  },
});

// Create Agent
const agent = createAgent({
  model,
  tools: [getMenuTool],
  systemPrompt:
    "You are a helpful restaurant assistant. Use the menu tool when the user asks about the restaurant menu.",
});

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Test agent
app.get("/test", async (req, res) => {
  try {
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: "What is today's lunch menu?",
        },
      ],
    });

    const lastMessage = result.messages[result.messages.length - 1];

    res.json({
      answer: lastMessage.content,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});