const STYLE_PROMPTS = {
  watercolor: 'watercolor caricature painting, soft watercolor textures, artistic pencil sketch outlines, colorful wash, whimsical, clean studio background, highly detailed, expressive portrait',
  comic: 'retro american comic book style caricature, bold ink outlines, dynamic halftone dots pattern, vibrant colors, pop art, action pose, detailed illustration, expressive features',
  hero: 'epic marvel superhero caricature, dynamic cinematic lighting, wearing a custom heroic costume, dramatic pose, glowing power effects, detailed digital painting, heroic expression',
  pixel: 'retro 8-bit arcade game character, pixel art caricature, pixelated portrait, classic color palette, blocky shadows, clean game background, retro aesthetic',
  disney: '3D Disney Pixar character caricature, rendering in cute claymation style, big expressive eyes, smooth glossy lighting, colorful background, highly detailed 3D render',
  sketch: 'fine art graphite pencil sketch caricature, hand-drawn shading, cross-hatching, realistic pencil textures, paper background, black and white portrait, highly artistic, clean line art'
};

export default async function handler(req, res) {
  // Setup CORS Headers for safety
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  }

  const { image, style, prompt } = req.body;

  if (!image) {
    return res.status(400).json({ error: '이미지 데이터가 필요합니다.' });
  }

  const selectedStyle = style || 'watercolor';
  const stylePrompt = STYLE_PROMPTS[selectedStyle] || STYLE_PROMPTS.watercolor;
  
  // Combine preset style prompt with optional custom user prompt
  const finalPrompt = prompt 
    ? `${stylePrompt}, ${prompt}`
    : stylePrompt;

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;
  const stabilityKey = process.env.STABILITY_API_KEY;

  // -------------------------------------------------------------
  // 1. Replicate API Mode (Stable Diffusion XL Image-to-Image)
  // -------------------------------------------------------------
  if (replicateToken && replicateToken !== 'YOUR_REPLICATE_API_TOKEN_HERE') {
    try {
      console.log(`[VERCEL REPLICATE] Running face-to-many caricature pipeline. Style: ${selectedStyle}`);
      
      const replicateStyles = {
        watercolor: 'Clay',
        comic: 'Video game',
        hero: 'Video game',
        pixel: 'Pixels',
        disney: '3D',
        sketch: 'Clay'
      };
      const replicateStyle = replicateStyles[selectedStyle] || '3D';

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf',
          input: {
            image: image,
            style: replicateStyle,
            prompt: finalPrompt,
            denoising_strength: 0.75,
            instant_id_strength: 0.7,
            control_depth_strength: 0.6,
            negative_prompt: 'blurry, low quality, photorealistic, bad anatomy, deformed face, disfigured, extra limbs, bad proportions, realistic, photo, photograph',
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

      console.log(`[VERCEL REPLICATE] Prediction created with ID: ${predictionId}. Status: ${status}`);

      let attempts = 0;
      const maxAttempts = 40; // 최대 60초 대기

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
        console.log(`[VERCEL REPLICATE] Polling... Attempt ${attempts}. Status: ${status}`);

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

      console.log(`[VERCEL REPLICATE] Generation succeeded. Downloading image from ${resultImageUrl}...`);

      const imageResponse = await fetch(resultImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image from Replicate: ${imageResponse.statusText}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');

      return res.status(200).json({
        success: true,
        image: `data:image/jpeg;base64,${base64Image}`,
        isMock: false,
        promptUsed: finalPrompt
      });

    } catch (error) {
      console.error('[VERCEL REPLICATE ERROR]', error);
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
      console.log(`[VERCEL GEMINI] Running 2-stage caricature pipeline. Style: ${selectedStyle}`);
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
      console.log(`[VERCEL GEMINI] Face Analysis: ${faceDescription}`);

      // Stage 2: Pass description to Imagen 4 to paint the caricature
      const finalPromptForGemini = `${stylePrompt}, a caricature of: ${faceDescription}. ${prompt || ''}`;
      console.log(`[VERCEL GEMINI] Sending prompt to Imagen 4: ${finalPromptForGemini}`);

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

      return res.status(200).json({
        success: true,
        image: `data:image/jpeg;base64,${imageBytes}`,
        isMock: false,
        promptUsed: finalPromptForGemini
      });

    } catch (error) {
      console.error('[VERCEL GEMINI ERROR]', error);
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
      console.log(`[VERCEL REAL] Connecting to Stability AI. Style: ${selectedStyle}`);
      
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

      return res.status(200).json({
        success: true,
        image: `data:image/jpeg;base64,${generatedBase64}`,
        isMock: false,
        promptUsed: finalPrompt
      });

    } catch (error) {
      console.error('[VERCEL REAL ERROR]', error);
      return res.status(500).json({ 
        error: 'AI 이미지 생성 중 오류가 발생했습니다.', 
        details: error.message 
      });
    }
  }

  // -------------------------------------------------------------
  // 3. Mock Mode Fallback (Simulated AI Generation)
  // -------------------------------------------------------------
  console.log(`[VERCEL MOCK] Style: ${selectedStyle}, Custom prompt: ${prompt || 'None'}`);
  
  // Simulate 3 seconds generation delay
  await new Promise((resolve) => setTimeout(resolve, 3000));
  
  const mockImageUrl = `/mock_${selectedStyle}.jpg`;
  
  return res.status(200).json({
    success: true,
    image: mockImageUrl,
    isMock: true,
    promptUsed: finalPrompt
  });
}
