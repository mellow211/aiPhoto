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

  const apiKey = process.env.STABILITY_API_KEY;

  if (!apiKey || apiKey === 'YOUR_STABILITY_API_KEY_HERE') {
    // -------------------------------------------------------------
    // Mock Mode Fallback (Simulated AI Generation)
    // -------------------------------------------------------------
    console.log(`[MOCK AI] Style: ${selectedStyle}, Custom prompt: ${prompt || 'None'}`);
    console.log(`[MOCK AI] Simulating 3-second generation delay...`);
    
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // In dev mode, return the local asset URL path
    // Vite serves static files from `src/assets` or public folder, so we map:
    // /src/assets/mock_{style}.jpg
    const mockImageUrl = `/mock_${selectedStyle}.jpg`;
    
    return res.json({
      success: true,
      image: mockImageUrl,
      isMock: true,
      promptUsed: finalPrompt
    });
  }

  // -------------------------------------------------------------
  // Real API Mode: Stability AI Image-to-Image
  // -------------------------------------------------------------
  try {
    console.log(`[REAL AI] Connecting to Stability AI. Style: ${selectedStyle}`);
    
    // Parse the base64 init image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Stability AI v1 Generation (Stable Diffusion v1.6 or SDXL) Image-to-Image FormData
    const formData = new FormData();
    formData.append('init_image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'init_image.jpg');
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.35'); // 0.35 retains structural posture but shifts artistic style
    formData.append('text_prompts[0][text]', finalPrompt);
    formData.append('text_prompts[0][weight]', '1.0');
    
    // Negative prompt to prevent ugly results
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
          'Authorization': `Bearer ${apiKey}`,
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
