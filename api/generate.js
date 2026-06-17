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

// Polling helper for Replicate predictions
async function pollReplicatePrediction(predictionId, replicateToken) {
  let status = 'starting';
  let output = null;
  let attempts = 0;
  const maxAttempts = 120; // Up to 144 seconds wait time

  while (status !== 'succeeded' && status !== 'failed' && status !== 'canceled' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1200));
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

    if (status === 'failed' || status === 'canceled') {
      throw new Error(`Replicate prediction ended with status: ${status}. Error: ${pollData.error || 'Unknown error'}`);
    }
  }

  if (status !== 'succeeded') {
    throw new Error('Replicate prediction timed out.');
  }

  return output;
}

// Rate limit retry wrapper for creating Replicate predictions
async function createPredictionWithRetry(identifier, input, replicateToken) {
  let attempts = 0;
  const maxAttempts = 5;

  const body = {};
  if (identifier.includes('/')) {
    body.model = identifier;
  } else {
    body.version = identifier;
  }
  body.input = input;

  while (attempts < maxAttempts) {
    attempts++;
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (response.status === 429) {
      const errBodyText = await response.text();
      let retryAfter = 3; // default fallback wait
      try {
        const errJson = JSON.parse(errBodyText);
        if (errJson.retry_after) {
          retryAfter = parseFloat(errJson.retry_after) + 0.5;
        }
      } catch (e) {}

      const headerRetryAfter = response.headers.get('retry-after');
      if (headerRetryAfter) {
        retryAfter = parseFloat(headerRetryAfter) + 0.5;
      }

      console.warn(`[VERCEL REPLICATE] Rate limited (429). Retrying after ${retryAfter}s... (Attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Replicate API returned status ${response.status}: ${errText}`);
    }

    return await response.json();
  }

  throw new Error('Replicate API failed after maximum retry attempts due to rate limit (429).');
}

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

  const { image, style, prompt, gender } = req.body;

  if (!image) {
    return res.status(400).json({ error: '이미지 데이터가 필요합니다.' });
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

  const openaiKey = process.env.OPENAI_API_KEY;
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;
  const stabilityKey = process.env.STABILITY_API_KEY;

  // -------------------------------------------------------------
  // 1. OpenAI API Mode (GPT-4o Vision + DALL-E 3 Pipeline)
  // -------------------------------------------------------------
  if (openaiKey && openaiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
    try {
      console.log(`[VERCEL OPENAI] Running GPT-4o + DALL-E 3 caricature pipeline. Style: ${selectedStyle}, Gender: ${selectedGender}`);
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

      // Stage 1: Analyze captured image using GPT-4o Vision
      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze the person in this image. Write a detailed description of their facial features, expression, hair color/style, clothing, and general age. Note that the person's gender is ${selectedGender === 'female' ? 'female' : 'male'}. DO NOT describe the background or surroundings. Output ONLY the description of the person in a single paragraph, optimized as an image generation prompt. Do not write any intro or formatting blocks.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        })
      });

      if (!visionResponse.ok) {
        const errText = await visionResponse.text();
        throw new Error(`OpenAI GPT-4o vision analysis failed: ${errText}`);
      }

      const visionData = await visionResponse.json();
      const faceDescription = visionData.choices?.[0]?.message?.content || 'A person';
      console.log(`[VERCEL OPENAI] Face Analysis: ${faceDescription}`);

      // Stage 2: Pass description and user custom requirements to DALL-E 3
      const finalPromptForDalle = `${stylePrompt}, a caricature of: ${faceDescription}. ${translatedPrompt || ''}`;
      console.log(`[VERCEL OPENAI] Sending prompt to DALL-E 3: ${finalPromptForDalle}`);

      const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: finalPromptForDalle,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json'
        })
      });

      if (!dalleResponse.ok) {
        const errText = await dalleResponse.text();
        throw new Error(`OpenAI DALL-E 3 failed: ${errText}`);
      }

      const dalleData = await dalleResponse.json();
      const base64Image = dalleData.data?.[0]?.b64_json;
      if (!base64Image) {
        throw new Error('DALL-E 3 returned no image data.');
      }

      return res.status(200).json({
        success: true,
        image: `data:image/png;base64,${base64Image}`,
        isMock: false,
        promptUsed: finalPromptForDalle
      });

    } catch (error) {
      console.error('[VERCEL OPENAI ERROR]', error);
      return res.status(500).json({ 
        error: 'OpenAI 이미지 생성 중 오류가 발생했습니다.', 
        details: error.message 
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Replicate API Mode (GPT-4o Vision + GPT Image 2 Pipeline)
  // -------------------------------------------------------------
  if (replicateToken && replicateToken !== 'YOUR_REPLICATE_API_TOKEN_HERE') {
    try {
      console.log(`[VERCEL REPLICATE] Stage 1: Running gpt-4o (Image-to-Text). Style: ${selectedStyle}, Gender: ${selectedGender}`);

      const visionPrompt = `Analyze the person in this image. Write a detailed description of their facial features, expression, hair color/style, clothing, and general age. Note that the person's gender is ${selectedGender === 'female' ? 'female' : 'male'}. DO NOT describe the background or surroundings. Output ONLY the description of the person in a single paragraph, optimized as an image generation prompt. Do not write any intro or formatting blocks.`;

      // 1. Call gpt-4o to describe the image using retry wrapper
      const gptPrediction = await createPredictionWithRetry(
        'openai/gpt-4o',
        { prompt: visionPrompt, image_input: [image] },
        replicateToken
      );
      console.log(`[VERCEL REPLICATE] gpt-4o prediction created with ID: ${gptPrediction.id}. Polling...`);
      
      const gptOutput = await pollReplicatePrediction(gptPrediction.id, replicateToken);
      const faceDescription = Array.isArray(gptOutput) ? gptOutput.join('') : gptOutput;
      console.log(`[VERCEL REPLICATE] gpt-4o Face Analysis description: "${faceDescription}"`);

      // 2. Call gpt-image-2 to generate the caricature
      console.log(`[VERCEL REPLICATE] Stage 2: Running gpt-image-2 (Text-to-Image).`);
      
      const finalPromptForGPT = `${stylePrompt}, a caricature of: ${faceDescription}. ${translatedPrompt || ''}`;
      console.log(`[VERCEL REPLICATE] Sending prompt to gpt-image-2: "${finalPromptForGPT}"`);

      // 2. Call gpt-image-2 using retry wrapper
      const imagePrediction = await createPredictionWithRetry(
        'openai/gpt-image-2',
        {
          prompt: finalPromptForGPT,
          aspect_ratio: '1:1'
        },
        replicateToken
      );
      console.log(`[VERCEL REPLICATE] gpt-image-2 prediction created with ID: ${imagePrediction.id}. Polling...`);

      const imageOutput = await pollReplicatePrediction(imagePrediction.id, replicateToken);
      const resultImageUrl = Array.isArray(imageOutput) ? imageOutput[0] : imageOutput;

      if (!resultImageUrl) {
        throw new Error('Replicate gpt-image-2 did not return any output image URL.');
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
        promptUsed: finalPromptForGPT
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
      console.log(`[VERCEL GEMINI] Running 2-stage caricature pipeline. Style: ${selectedStyle}, Gender: ${selectedGender}`);
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
      console.log(`[VERCEL GEMINI] Face Analysis: ${faceDescription}`);

      // Stage 2: Pass description to Imagen 4 to paint the caricature
      const finalPromptForGemini = `${stylePrompt}, a caricature of: ${faceDescription}. ${translatedPrompt || ''}`;
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
  // 3. Stability AI Mode (Stable Diffusion XL Image-to-Image)
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
  // 4. Mock Mode Fallback (Simulated AI Generation)
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
