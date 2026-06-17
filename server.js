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
// Style Prompt Map for Stability AI & Replicate
// -------------------------------------------------------------
const STYLE_PROMPTS_MALE = {
  watercolor: 'gorgeous stylized watercolor caricature portrait illustration, soft artistic watercolor textures, colorful paint wash, whimsical, clean studio background, handsome face, manly features, highly detailed digital art',
  comic: 'handsome webtoon digital caricature illustration, charming anime style portrait, clean ink outlines, vibrant colors, pop art, detailed, handsome, expressive friendly features',
  hero: 'epic marvel male superhero caricature illustration, dynamic cinematic lighting, wearing a custom heroic costume, dramatic pose, glowing power effects, detailed digital painting, handsome man, muscular build',
  pixel: 'cute retro 8-bit pixel art male character caricature portrait, classic color palette, blocky shadows, clean game background, retro aesthetic, charming, handsome features',
  disney: 'cute 3D Disney Pixar male character, gorgeous glossy render, big expressive eyes, smooth rendering style, colorful background, highly detailed 3D render, handsome face',
  sketch: 'fine art graphite pencil sketch caricature portrait, handsome hand-drawn shading, cross-hatching, realistic pencil textures, clean white paper background, highly artistic, clean line art, handsome face'
};

const STYLE_PROMPTS_FEMALE = {
  watercolor: 'gorgeous stylized watercolor caricature portrait illustration, soft artistic watercolor textures, colorful paint wash, whimsical, clean studio background, beautiful face, pretty features, highly detailed digital art',
  comic: 'beautiful webtoon digital caricature illustration, charming anime style portrait, clean ink outlines, vibrant colors, pop art, detailed, pretty face, expressive friendly features',
  hero: 'epic beautiful marvel female superhero caricature illustration, dynamic cinematic lighting, wearing a custom heroic costume, dramatic pose, glowing power effects, detailed digital painting, pretty face',
  pixel: 'cute retro 8-bit pixel art female character caricature portrait, classic color palette, blocky shadows, clean game background, retro aesthetic, charming, cute features',
  disney: 'cute 3D Disney Pixar female character, gorgeous glossy render, big beautiful expressive eyes, smooth rendering style, colorful background, highly detailed 3D render, pretty, lovely face',
  sketch: 'fine art graphite pencil sketch caricature portrait, beautiful hand-drawn shading, cross-hatching, realistic pencil textures, clean white paper background, highly artistic, clean line art, pretty face'
};

// Translation helper using Google Translate's free API
async function translateToEnglish(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z0-9\s,一边.!?-]+$/.test(trimmed)) return trimmed;
  
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`
    );
    if (!response.ok) return trimmed;
    const data = await response.json();
    if (data && data[0]) {
      return data[0].map(x => x[0]).join(' ').trim();
    }
    return trimmed;
  } catch (error) {
    console.error('[TRANSLATE ERROR]', error);
    return trimmed;
  }
}

// -------------------------------------------------------------
// API Route: Generate Caricature
// -------------------------------------------------------------
app.post('/api/generate', async (req, res) => {
  const { image, style, prompt, gender } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image is required.' });
  }

  const selectedGender = gender || 'male';
  const selectedStyle = style || 'watercolor';
  const promptsByGender = selectedGender === 'female' ? STYLE_PROMPTS_FEMALE : STYLE_PROMPTS_MALE;
  const stylePrompt = promptsByGender[selectedStyle] || promptsByGender.watercolor;
  
  // Translate custom prompt to English
  const translatedPrompt = await translateToEnglish(prompt);
  
  // Combine preset style prompt with optional custom user prompt
  const finalPrompt = translatedPrompt 
    ? `${stylePrompt}, ${translatedPrompt}`
    : stylePrompt;

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;
  const stabilityKey = process.env.STABILITY_API_KEY;

  // -------------------------------------------------------------
  // 1. Replicate API Mode (Stable Diffusion XL Image-to-Image / InstantID)
  // -------------------------------------------------------------
  if (replicateToken && replicateToken !== 'YOUR_REPLICATE_API_TOKEN_HERE') {
    try {
      console.log(`[REPLICATE AI] Running zsxkib/instant-id caricature pipeline. Style: ${selectedStyle}, Gender: ${selectedGender}`);
      
      const baseModelWeights = {
        watercolor: 'dreamshaper-xl',
        comic: 'animagine-xl-30',
        hero: 'animagine-xl-30',
        pixel: 'dreamshaper-xl',
        disney: 'dynavision-xl-v0610',
        sketch: 'dreamshaper-xl'
      };
      const selectedWeights = baseModelWeights[selectedStyle] || 'stable-diffusion-xl-base-1.0';

      const genderPrompt = selectedGender === 'female'
        ? 'solo, 1girl, beautiful face, female, gorgeous, lovely features, highly detailed, symmetrical features, smooth skin, charming smile'
        : 'solo, 1boy, handsome face, male, masculine features, handsome, highly detailed, symmetrical features, smooth skin, charming smile';

      const negativePrompt = 'group, 2boys, 2girls, multiple views, multi-panel, collage, split screen, blurry, low quality, photorealistic, realistic, photograph, photo, bad anatomy, deformed face, disfigured, extra limbs, bad proportions, ugly, distorted, deformed';

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: '2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789',
          input: {
            image: image,
            prompt: `${finalPrompt}, ${genderPrompt}`,
            negative_prompt: negativePrompt,
            sdxl_weights: selectedWeights,
            ip_adapter_scale: 0.62, // Reduced from 0.8 for smoother caricature stylization
            num_inference_steps: 30,
            guidance_scale: 7 // Increased from 5 for better style prompt compliance
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Replicate API returned status ${response.status}: ${errText}`);
      }

      const prediction = await response.json();
      const predictionId = prediction.id;
      let status = prediction.status;
      let output = null;

      console.log(`[REPLICATE AI] Prediction created with ID: ${predictionId}. Status: ${status}`);

      let attempts = 0;
      const maxAttempts = 100; // 최대 150초 대기

      while (status !== 'succeeded' && status !== 'failed' && status !== 'canceled' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        attempts++;

        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Bearer ${replicateToken}`,
          }
        });

        if (!pollResponse.ok) {
          const errText = await pollResponse.text();
          throw new Error(`Replicate poll failed: ${errText}`);
        }

        const pollData = await pollResponse.json();
        status = pollData.status;
        output = pollData.output;
        console.log(`[REPLICATE AI] Polling... Attempt ${attempts}. Status: ${status}`);

        if (status === 'failed' || status === 'canceled') {
          throw new Error(`Replicate prediction ended with status: ${status}. Error: ${pollData.error || 'Unknown error'}`);
        }
      }

      if (status !== 'succeeded') {
        throw new Error('Replicate prediction timed out.');
      }

      const resultImageUrl = Array.isArray(output) ? output[0] : output;
      if (!resultImageUrl) {
        throw new Error('Replicate did not return any output image URL.');
      }

      console.log(`[REPLICATE AI] Generation succeeded. Downloading image from ${resultImageUrl}...`);

      const imageResponse = await fetch(resultImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image from Replicate: ${imageResponse.statusText}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');

      return res.json({
        success: true,
        image: `data:image/jpeg;base64,${base64Image}`,
        isMock: false,
        promptUsed: `${finalPrompt}, ${genderPrompt}`
      });

    } catch (error) {
      console.error('[REPLICATE AI ERROR]', error);
      return res.status(500).json({ 
        error: 'Replicate 이미지 생성 중 오류가 발생했습니다.', 
        details: error.message 
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Google Gemini API Mode (Imagen 4 + Gemini 2.5 Flash Pipeline)
  // -------------------------------------------------------------
  if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE' && !geminiKey.startsWith('AQ.')) {
    try {
      console.log(`[GEMINI AI] Running 2-stage caricature pipeline. Style: ${selectedStyle}, Gender: ${selectedGender}`);
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

      // Stage 1: Analyze captured image using Gemini 2.5 Flash
      const analyzeResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze the person in this image. Write a detailed description of their facial features, expression, hair color/style, clothing, and general age. Note that the person's gender is ${selectedGender === 'female' ? 'female' : 'male'}. Output ONLY the description in a single paragraph, optimized as an image generation prompt. Do not write any intro or formatting blocks.`
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

      // Stage 2: Pass description to Imagen 4 to paint the caricature
      const finalPromptForGemini = `${stylePrompt}, a caricature of: ${faceDescription}. ${translatedPrompt || ''}`;
      console.log(`[GEMINI AI] Sending prompt to Imagen 4: ${finalPromptForGemini}`);

      const imagenResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [
              {
                prompt: finalPromptForGemini
              }
            ],
            parameters: {
              sampleCount: 1,
              aspectRatio: '1:1'
            }
          })
        }
      );

      if (!imagenResponse.ok) {
        const errText = await imagenResponse.ok ? '' : await imagenResponse.text();
        throw new Error(`Gemini Imagen 4 failed: ${errText}`);
      }

      const imagenResult = await imagenResponse.json();
      const imageBytes = imagenResult.predictions?.[0]?.bytesBase64Encoded;
      if (!imageBytes) {
        throw new Error('Imagen 4 returned no image data.');
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
  // 3. Stability AI Mode (Stable Diffusion XL Image-to-Image)
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
      
      formData.append('text_prompts[1][text]', 'blurry, low quality, photorealistic, realistic, photograph, photo, bad anatomy, deformed face, disfigured, extra limbs, bad proportions');
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
  // 4. Mock Mode Fallback (Simulated AI Generation)
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
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;
  const stabilityKey = process.env.STABILITY_API_KEY;
  
  let mode = 'MOCK';
  if (replicateToken && replicateToken !== 'YOUR_REPLICATE_API_TOKEN_HERE') {
    mode = 'REPLICATE';
  } else if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE' && !geminiKey.startsWith('AQ.')) {
    mode = 'GEMINI';
  } else if (stabilityKey && stabilityKey !== 'YOUR_STABILITY_API_KEY_HERE') {
    mode = 'STABILITY';
  }

  console.log(`==================================================`);
  console.log(`  AI Caricature Server is running on port ${PORT}`);
  console.log(`  Active AI Mode: ${mode}`);
  console.log(`==================================================`);
});
