require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

// Configurar multer para almacenar la imagen en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Eres un asistente muy entusiasta y empático para una campaña de NYX Cosmetics durante la marcha del Pride.
      Tu tarea es analizar la imagen proporcionada (un cartel o pancarta) y detectar mensajes positivos de la comunidad.
      
      Reglas:
      1. Lee el texto que está escrito en la pancarta de la imagen.
      2. En el arreglo 'words', extrae las palabras clave importantes, pero TAMBIÉN puedes incluir frases cortas y poderosas que estén escritas en el cartel (ej. 'amor libre', 'derechos humanos', 'soy quien soy'). No inventes texto que no esté en la foto, pero captura bien la esencia de lo que está escrito.
      3. Asigna un porcentaje de descuento (entre 10 y 50). A mayor fuerza, positividad y significado del mensaje leído, mayor el descuento.
      4. En 'message', escribe un mensaje de celebración muy cálido, entusiasta y personalizado que responda a lo que dice su cartel. ¡Que se sienta la alegría y el orgullo! (No seas cortante).
      5. Si no hay cartel legible, el descuento debe ser 0.
      
      Debes devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura (sin formato de código Markdown adicional):
      {
        "discount": 40,
        "words": ["orgullo", "amor libre", "respeto"],
        "message": "¡Me encanta tu energía! 'Amor libre' es exactamente lo que celebramos hoy. ¡Aquí tienes tu descuento!"
      }
    `;

    const imageParts = [
      {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    // Limpiar posible formato markdown (ej. ```json ... ```)
    let cleanJson = responseText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

    const data = JSON.parse(cleanJson);

    res.json(data);
  } catch (error) {
    console.error("Error analyzing image:", error);
    res.status(500).json({ error: "Error analyzing image" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
