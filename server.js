import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and increase request body limit to handle base64 images
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static assets in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// -------------------------------------------------------------
// Style Prompt Map for Stability AI
// -------------------------------------------------------------
const STYLE_PROMPTS = {
  watercolor: 'watercolor caricature painting, soft watercolor textures, artistic pencil sketch outlines, colorful wash, whimsical, clean studio background, highly detailed, expressive portrait',
  comic: 'retro american comic book style caricature, bold ink outlines, dynamic halftone dots pattern, vibrant colors, pop art, action pose, detailed illustration, expressive features',
  hero: 'epic marvel superhero caricature, dynamic cinematic lighting, wearing a custom heroic costume, dramatic pose, glowing power effects, detailed digital painting, heroic expression',
  pixel: 'retro 8-bit arcade game character, pixel art caricature, pixelated portrait, classic color palette, blocky shadows, clean game background, retro aesthetic',
  disney: '3D Disney Pixar character caricature, rendering in cute claymation style, big expressive eyes, smooth glossy lighting, colorful background, highly detailed 3D render',
  sketch: 'fine art graphite pencil sketch caricature, hand-drawn shading, cross-hatching, realistic pencil textures, paper background, black and white portrait, highly artistic, clean line art'
};

// -------------------------------------------------------------
// API Route: Generate Caricature
// -------------------------------------------------------------
app.post('/api/generate', async (req, res) => {
  const { image, style, prompt } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image is required.' });
  }

  const selectedStyle = style || 'watercolor';
  const stylePrompt = STYLE_PROMPTS[selectedStyle] || STYLE_PROMPTS.watercolor;
  
  // Combine preset style prompt with optional custom user prompt
  const finalPrompt = prompt 
    ? `${stylePrompt}, ${prompt}`
    : stylePrompt;

  const geminiKey = process.env.GEMINI_API_KEY;
  const stabilityKey = process.env.STABILITY_API_KEY;

  // -------------------------------------------------------------
  // 1. Google Gemini API Mode (Imagen 3 + Gemini 1.5 Flash Pipeline)
  // -------------------------------------------------------------
  if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    try {
      console.log(`[GEMINI AI] Running 2-stage caricature pipeline. Style: ${selectedStyle}`);
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

      // Stage 1: Analyze captured image using Gemini 1.5 Flash
      const analyzeResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Analyze the person in this image. Write a detailed description of their facial features, expression, hair color/style, clothing, and general age. Output ONLY the description in a single paragraph, optimized as an image generation prompt. Do not write any intro or formatting blocks.'
                  },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        }
      );

      if (!analyzeResponse.ok) {
        const errText = await analyzeResponse.text();
        throw new Error(`Gemini face analysis failed: ${errText}`);
      }

      const analyzeResult = await analyzeResponse.json();
      const faceDescription = analyzeResult.candidates?.[0]?.content?.parts?.[0]?.text || 'A person';
      console.log(`[GEMINI AI] Face Analysis: ${faceDescription}`);

      // Stage 2: Pass description to Imagen 3 to paint the caricature
      const finalPromptForGemini = `${stylePrompt}, a caricature of: ${faceDescription}. ${prompt || ''}`;
      console.log(`[GEMINI AI] Sending prompt to Imagen 3: ${finalPromptForGemini}`);

      const imagenResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPromptForGemini,
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1'
          })
        }
      );

      if (!imagenResponse.ok) {
        const errText = await imagenResponse.text();
        throw new Error(`Gemini Imagen 3 failed: ${errText}`);
      }

      const imagenResult = await imagenResponse.json();
      const imageBytes = imagenResult.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) {
        throw new Error('Imagen 3 returned no image data.');
      }

      return res.json({
        success: true,
        image: `data:image/jpeg;base64,${imageBytes}`,
        isMock: false,
        promptUsed: finalPromptForGemini
      });

    } catch (error) {
      console.error('[GEMINI AI ERROR]', error);
      return res.status(500).json({ 
        error: 'Gemini 이미지 생성 중 오류가 발생했습니다.', 
        details: error.message 
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Stability AI Mode (Stable Diffusion XL Image-to-Image)
  // -------------------------------------------------------------
  if (stabilityKey && stabilityKey !== 'YOUR_STABILITY_API_KEY_HERE') {
    try {
      console.log(`[REAL AI] Connecting to Stability AI. Style: ${selectedStyle}`);
      
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const formData = new FormData();
      formData.append('init_image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'init_image.jpg');
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', '0.35');
      formData.append('text_prompts[0][text]', finalPrompt);
      formData.append('text_prompts[0][weight]', '1.0');
      
      formData.append('text_prompts[1][text]', 'blurry, low quality, photorealistic, bad anatomy, deformed face, disfigured, extra limbs, bad proportions');
      formData.append('text_prompts[1][weight]', '-1.0');

      formData.append('cfg_scale', '8');
      formData.append('samples', '1');
      formData.append('steps', '30');

      const response = await fetch(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stabilityKey}`,
            'Accept': 'application/json',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability AI API returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const generatedBase64 = result.artifacts[0].base64;

      return res.json({
        success: true,
        image: `data:image/jpeg;base64,${generatedBase64}`,
        isMock: false,
        promptUsed: finalPrompt
      });

    } catch (error) {
      console.error('[REAL AI ERROR]', error);
      return res.status(500).json({ 
        error: 'AI 이미지 생성 중 오류가 발생했습니다.', 
        details: error.message 
      });
    }
  }

  // -------------------------------------------------------------
  // 3. Mock Mode Fallback (Simulated AI Generation)
  // -------------------------------------------------------------
  console.log(`[MOCK AI] Style: ${selectedStyle}, Custom prompt: ${prompt || 'None'}`);
  console.log(`[MOCK AI] Simulating 3-second generation delay...`);
  
  await new Promise((resolve) => setTimeout(resolve, 3000));
  
  const mockImageUrl = `/mock_${selectedStyle}.jpg`;
  
  return res.json({
    success: true,
    image: mockImageUrl,
    isMock: true,
    promptUsed: finalPrompt
  });
});

// Fallback to serving SPA index.html for undefined routes in production
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  const apiKey = process.env.STABILITY_API_KEY;
  console.log(`==================================================`);
  console.log(`  AI Caricature Server is running on port ${PORT}`);
  console.log(`  Mock Mode: ${(!apiKey || apiKey === 'YOUR_STABILITY_API_KEY_HERE') ? 'ENABLED' : 'DISABLED'}`);
  console.log(`==================================================`);
});
