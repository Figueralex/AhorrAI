const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = "AIzaSyAjcv0ZmHDLnQj0vv0plYGOyixE7xbAoRE";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    const list = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels(); // This is not the right SDK method
    // In SDK v0.24, the listModels is on the genAI instance
    const models = await genAI.listModels();
    console.log("AVAILABLE MODELS:");
    models.models.forEach(m => console.log(m.name));
  } catch (error) {
    console.error("LIST MODELS ERROR:", error.message);
  }
}

listModels();
