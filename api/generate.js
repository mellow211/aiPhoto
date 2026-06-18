// Active Replicate Model Configuration (Change this to 'qwen/qwen-image-edit-plus' to switch models)
const ACTIVE_REPLICATE_MODEL = 'qwen/qwen-image-edit-plus';

const STYLE_PROMPTS_MALE = {
  default: 'gorgeous caricature illustration of a male character, fun cartoon caricature art style, expressive exaggerated caricature features, friendly smiling expression, clean background',
  watercolor: 'gorgeous stylized watercolor caricature portrait illustration, soft artistic watercolor textures, colorful paint wash, whimsical, clean studio background, handsome face, manly features, highly detailed digital art',
  comic: 'handsome webtoon digital caricature illustration, charming anime style portrait, clean ink outlines, vibrant colors, pop art, detailed, handsome, expressive friendly features',
  hero: 'epic comic book male superhero caricature illustration, dynamic cinematic lighting, wearing a custom heroic costume, dramatic pose, glowing power effects, detailed digital painting, handsome man, muscular build',
  pixel: 'cute retro 8-bit pixel art male character caricature portrait, classic color palette, blocky shadows, clean game background, retro aesthetic, charming, handsome features',
  disney: 'cute 3D animated movie style male character, gorgeous glossy render, big expressive eyes, smooth rendering style, colorful background, highly detailed 3D render, handsome face',
  sketch: 'fine art graphite pencil sketch caricature portrait, handsome hand-drawn shading, cross-hatching, realistic pencil textures, clean white paper background, highly artistic, clean line art, handsome face'
};

const STYLE_PROMPTS_FEMALE = {
  default: 'gorgeous caricature illustration of a female character, fun cartoon caricature art style, expressive exaggerated caricature features, friendly smiling expression, clean background',
  watercolor: 'gorgeous stylized watercolor caricature portrait illustration, soft artistic watercolor textures, colorful paint wash, whimsical, clean studio background, beautiful face, pretty features, highly detailed digital art',
  comic: 'beautiful webtoon digital caricature illustration, charming anime style portrait, clean ink outlines, vibrant colors, pop art, detailed, pretty face, expressive friendly features',
  hero: 'epic beautiful comic book female superhero caricature illustration, dynamic cinematic lighting, wearing a custom heroic costume, dramatic pose, glowing power effects, detailed digital painting, pretty face',
  pixel: 'cute retro 8-bit pixel art female character caricature portrait, classic color palette, blocky shadows, clean game background, retro aesthetic, charming, cute features',
  disney: 'cute 3D animated movie style female character, gorgeous glossy render, big beautiful expressive eyes, smooth rendering style, colorful background, highly detailed 3D render, pretty, lovely face',
  sketch: 'fine art graphite pencil sketch caricature portrait, beautiful hand-drawn shading, cross-hatching, realistic pencil textures, clean white paper background, highly artistic, clean line art, pretty face'
};

const BASE_CARICATURE_PROMPT = 'gorgeous caricature illustration, fun cartoon caricature art style, expressive exaggerated caricature features';

const STYLE_MAP = {
  default: BASE_CARICATURE_PROMPT,
  watercolor: `${BASE_CARICATURE_PROMPT}, soft watercolor textures, colorful paint wash, whimsical, clean studio background`,
  comic: `${BASE_CARICATURE_PROMPT}, webtoon digital style, anime style, clean ink outlines, vibrant colors`,
  hero: `${BASE_CARICATURE_PROMPT}, epic superhero style, dramatic cinematic lighting, glowing power effects`,
  pixel: `${BASE_CARICATURE_PROMPT}, retro 8-bit pixel art style, blocky shadows, clean game background`,
  disney: `${BASE_CARICATURE_PROMPT}, cute 3D animated movie style, glossy 3D render, big expressive eyes, smooth rendering`,
  sketch: `${BASE_CARICATURE_PROMPT}, graphite pencil sketch style, hand-drawn shading, cross-hatching, clean paper background`
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

// Prompt Expansion Helpers using dynamic API configurations
async function expandPromptWithGemini(promptText, geminiKey) {
  const systemPrompt = `You are a prompt designer for an AI caricature photo booth. Your task is to take a simple, short user instruction (in Korean or English) and expand it into a detailed, creative description in English, optimized for image generation. Focus purely on describing the requested clothing, props, and setting in detail. Keep it descriptive, bright, and cheerful. DO NOT include any introductory or meta text like "Here is the expanded prompt". Only output the final expanded English prompt in a single paragraph (maximum 3 sentences, 40 words).`;
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `User Input: ${promptText}` }
            ]
          }
        ]
      })
    }
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini expansion HTTP error: ${response.status}. ${errText}`);
  }
  const data = await response.json();
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error('Gemini returned empty expanded prompt');
  return resultText.trim();
}

async function expandPromptWithOpenAI(promptText, openaiKey) {
  const systemPrompt = `You are a prompt designer for an AI caricature photo booth. Your task is to take a simple, short user instruction (in Korean or English) and expand it into a detailed, creative description in English, optimized for image generation. Focus purely on describing the requested clothing, props, and setting in detail. Keep it descriptive, bright, and cheerful. DO NOT include any introductory or meta text like "Here is the expanded prompt". Only output the final expanded English prompt in a single paragraph (maximum 3 sentences, 40 words).`;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptText }
      ],
      max_tokens: 100
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI expansion HTTP error: ${response.status}. ${errText}`);
  }
  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  if (!resultText) throw new Error('OpenAI returned empty expanded prompt');
  return resultText.trim();
}

async function expandPromptWithReplicate(promptText, replicateToken) {
  const systemPrompt = `You are a prompt designer for an AI caricature photo booth. Your task is to take a simple, short user instruction (in Korean or English) and expand it into a detailed, creative description in English, optimized for image generation. Focus purely on describing the requested clothing, props, and setting in detail. Keep it descriptive, bright, and cheerful. DO NOT include any introductory or meta text like "Here is the expanded prompt". Only output the final expanded English prompt in a single paragraph (maximum 3 sentences, 40 words).`;
  
  const prediction = await createPredictionWithRetry(
    'meta/meta-llama-3-8b-instruct',
    {
      prompt: `User Input: ${promptText}`,
      system_prompt: systemPrompt,
      max_new_tokens: 100,
      temperature: 0.7
    },
    replicateToken
  );
  
  const output = await pollReplicatePrediction(prediction.id, replicateToken);
  let resultText = Array.isArray(output) ? output.join('') : output;
  if (!resultText) throw new Error('Replicate LLM returned empty expanded prompt');
  
  resultText = resultText.replace(/Output:/gi, '').replace(/User Input:/gi, '').trim();
  return resultText;
}

async function expandUserPrompt(promptText) {
  if (!promptText || typeof promptText !== 'string') return '';
  const trimmed = promptText.trim();
  if (!trimmed) return '';

  const openaiKey = process.env.OPENAI_API_KEY;
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Try Gemini
  if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    try {
      console.log(`[PROMPT EXPANSION] Trying Gemini for: "${trimmed}"`);
      const expanded = await expandPromptWithGemini(trimmed, geminiKey);
      console.log(`[PROMPT EXPANSION] Gemini Success: "${expanded}"`);
      return expanded;
    } catch (e) {
      console.warn(`[PROMPT EXPANSION] Gemini failed, falling back:`, e.message);
    }
  }

  // 2. Try OpenAI
  if (openaiKey && openaiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
    try {
      console.log(`[PROMPT EXPANSION] Trying OpenAI for: "${trimmed}"`);
      const expanded = await expandPromptWithOpenAI(trimmed, openaiKey);
      console.log(`[PROMPT EXPANSION] OpenAI Success: "${expanded}"`);
      return expanded;
    } catch (e) {
      console.warn(`[PROMPT EXPANSION] OpenAI failed, falling back:`, e.message);
    }
  }

  // 3. Try Replicate (Llama-3-8b)
  if (replicateToken && replicateToken !== 'YOUR_REPLICATE_API_TOKEN_HERE') {
    try {
      console.log(`[PROMPT EXPANSION] Trying Replicate (Llama-3-8b) for: "${trimmed}"`);
      const expanded = await expandPromptWithReplicate(trimmed, replicateToken);
      console.log(`[PROMPT EXPANSION] Replicate Success: "${expanded}"`);
      return expanded;
    } catch (e) {
      console.warn(`[PROMPT EXPANSION] Replicate failed, falling back:`, e.message);
    }
  }

  // 4. Final Fallback: Simple Translation
  try {
    console.log(`[PROMPT EXPANSION] Falling back to Google Translation for: "${trimmed}"`);
    const translated = await translateToEnglish(trimmed);
    console.log(`[PROMPT EXPANSION] Translation Success: "${translated}"`);
    return translated;
  } catch (e) {
    console.error(`[PROMPT EXPANSION] Final fallback failed:`, e.message);
    return trimmed;
  }
}

// Cancel helper for Replicate predictions to prevent wasting credits on timed out calls
async function cancelReplicatePrediction(predictionId, replicateToken) {
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
      }
    });
    if (response.ok) {
      console.log(`[REPLICATE] Canceled prediction successfully: ${predictionId}`);
    } else {
      console.warn(`[REPLICATE] Failed to cancel prediction ${predictionId}: status ${response.status}`);
    }
  } catch (err) {
    console.warn(`[REPLICATE] Error canceling prediction ${predictionId}:`, err.message);
  }
}

// Analyze image utilizing Replicate VLM models as fallback for GPT-4o vision or Gemini Flash
async function analyzeImageWithReplicateVLM(image, gender, replicateToken) {
  try {
    console.log(`[REPLICATE VLM] Analyzing face using yorickvp/llava-v1.6-mistral-7b`);
    const prompt = `Analyze the person in this image. Write a detailed description of their facial features, expression, hair color/style, clothing, and general age. Note that the person's gender is ${gender === 'female' ? 'female' : 'male'}. DO NOT describe the background or surroundings. Output ONLY the description of the person in a single paragraph, optimized as an image generation prompt. Do not write any intro or formatting blocks.`;
    
    const prediction = await createPredictionWithRetry(
      '19be067b589d0c46689ffa7cc3ff321447a441986a7694c01225973c2eafc874',
      {
        image: image,
        prompt: prompt,
        max_tokens: 300
      },
      replicateToken
    );
    // Limit face description vision model polling to 12 seconds to prevent Vercel 60s timeout
    const output = await pollReplicatePrediction(prediction.id, replicateToken, 12);
    const resultText = Array.isArray(output) ? output.join('') : output;
    if (!resultText) throw new Error('Replicate VLM returned empty description');
    return resultText.trim();
  } catch (error) {
    console.error(`[REPLICATE VLM] LLaVA analysis failed or timed out:`, error.message);
    return `A portrait of a ${gender === 'female' ? 'female' : 'male'} user with friendly expression`;
  }
}

// Polling helper for Replicate predictions with customizable timeout limit (in seconds)
async function pollReplicatePrediction(predictionId, replicateToken, maxSeconds = 120) {
  let status = 'starting';
  let output = null;
  let attempts = 0;
  const maxAttempts = Math.ceil(maxSeconds / 1.2);

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
    // Attempt to cancel the remote task if it's still running/queued to save credits
    await cancelReplicatePrediction(predictionId, replicateToken);
    throw new Error(`Replicate prediction timed out after ${maxSeconds} seconds.`);
  }

  return output;
}

// Rate limit retry wrapper for creating Replicate predictions
async function createPredictionWithRetry(identifier, input, replicateToken) {
  let attempts = 0;
  const maxAttempts = 5;

  let url = 'https://api.replicate.com/v1/predictions';
  const body = { input };

  if (identifier.includes('/')) {
    url = `https://api.replicate.com/v1/models/${identifier}/predictions`;
  } else {
    body.version = identifier;
  }

  while (attempts < maxAttempts) {
    attempts++;
    const response = await fetch(url, {
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

  const { image, style, prompt, gender, model } = req.body;

  if (!image) {
    return res.status(400).json({ error: '이미지 데이터가 필요합니다.' });
  }

  const selectedGender = gender || 'male';
  const selectedStyle = style || 'watercolor';
  const promptsByGender = selectedGender === 'female' ? STYLE_PROMPTS_FEMALE : STYLE_PROMPTS_MALE;
  const stylePrompt = promptsByGender[selectedStyle] || promptsByGender.default || promptsByGender.watercolor;
  
  // Translate and expand custom prompt using dynamic AI LLM tools
  const translatedPrompt = await expandUserPrompt(prompt);
  
  const baseCaricaturePrompt = `Create a professional theme-park style caricature from this photo. ` +
    `This must not look like a simple cartoon filter or a painted version of the photo. ` +
    `Keep the person clearly recognizable, including hairstyle, face shape, expression, and outfit. ` +
    `Create a large head and small body caricature. ` +
    `Slightly exaggerate the person's most distinctive facial features in a cute, friendly, and flattering way. ` +
    `Emphasize the face shape, eyes, nose, smile, and hairstyle while preserving identity. ` +
    `Use clean bold outlines, bright cheerful colors, polished illustration quality, and a souvenir caricature style. ` +
    `Make it suitable for children and families at an AI photo booth. ` +
    `No text, no watermark, no logo, no realistic photo texture, no plain cartoon filter. ` +
    `Use a simple clean background or transparent background if supported.`;

  // Combine base caricature prompt, preset style prompt, and optional custom user prompt
  let finalPrompt = `${baseCaricaturePrompt} Style: ${stylePrompt}.`;
  if (translatedPrompt) {
    finalPrompt += ` Background and outfit instructions: ${translatedPrompt}.`;
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;
  const stabilityKey = process.env.STABILITY_API_KEY;

  // 1. Determine which model to run based on the request 'model' field
  // If model is not specified, auto-detect based on available keys
  let targetModel = model;
  if (!targetModel) {
    if (openaiKey && openaiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
      targetModel = 'openai_dalle';
    } else if (replicateToken && replicateToken !== 'YOUR_REPLICATE_API_TOKEN_HERE') {
      targetModel = 'replicate_flux';
    } else if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      targetModel = 'gemini_imagen';
    } else if (stabilityKey && stabilityKey !== 'YOUR_STABILITY_API_KEY_HERE') {
      targetModel = 'stability_sdxl';
    } else {
      targetModel = 'mock';
    }
  }

  // 2. Validate API key availability for the selected model or check for Replicate Fallback
  const hasOpenAI = openaiKey && openaiKey !== 'YOUR_OPENAI_API_KEY_HERE';
  const hasReplicate = replicateToken && replicateToken !== 'YOUR_REPLICATE_API_TOKEN_HERE';
  const hasGemini = geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE';
  const hasStability = stabilityKey && stabilityKey !== 'YOUR_STABILITY_API_KEY_HERE';

  if (targetModel === 'openai_dalle' && !hasOpenAI && !hasReplicate) {
    return res.status(400).json({ error: 'OpenAI API Key 혹은 Replicate Token이 백엔드 환경 변수에 설정되지 않았습니다. .env 파일을 확인해 주세요.' });
  }
  if ((targetModel === 'replicate_flux' || targetModel === 'replicate_qwen') && !hasReplicate) {
    return res.status(400).json({ error: 'Replicate API Token이 백엔드 환경 변수에 설정되지 않았습니다. .env 파일을 확인해 주세요.' });
  }
  if (targetModel === 'gemini_imagen' && !hasGemini && !hasReplicate) {
    return res.status(400).json({ error: 'Gemini API Key 혹은 Replicate Token이 백엔드 환경 변수에 설정되지 않았습니다. .env 파일을 확인해 주세요.' });
  }
  if (targetModel === 'stability_sdxl' && !hasStability && !hasReplicate) {
    return res.status(400).json({ error: 'Stability AI API Key 혹은 Replicate Token이 백엔드 환경 변수에 설정되지 않았습니다. .env 파일을 확인해 주세요.' });
  }

  // 3. Execute model-specific pipeline
  
  // -------------------------------------------------------------
  // OpenAI API Mode (GPT-4o Vision + DALL-E 3 Pipeline)
  // -------------------------------------------------------------
  if (targetModel === 'openai_dalle') {
    if (hasOpenAI) {
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
    } else {
      // Replicate Fallback (Llama 3.2 Vision VLM + Replicate FLUX)
      try {
        console.log(`[VERCEL OPENAI - REPLICATE FALLBACK] Running Replicate Fallback for GPT-4o + DALL-E 3`);
        const faceDescription = await analyzeImageWithReplicateVLM(image, selectedGender, replicateToken);
        console.log(`[VERCEL OPENAI - REPLICATE FALLBACK] Face Analysis: ${faceDescription}`);

        const finalPromptForFlux = `${stylePrompt}, a caricature of: ${faceDescription}. ${translatedPrompt || ''}`;
        console.log(`[VERCEL OPENAI - REPLICATE FALLBACK] Sending prompt to FLUX: ${finalPromptForFlux}`);

        const prediction = await createPredictionWithRetry(
          'black-forest-labs/flux-kontext-pro',
          {
            input_image: image,
            prompt: finalPromptForFlux,
            aspect_ratio: 'match_input_image',
            output_format: 'png',
            safety_tolerance: 2,
            prompt_upsampling: false
          },
          replicateToken
        );
        const output = await pollReplicatePrediction(prediction.id, replicateToken);
        const resultImageUrl = Array.isArray(output) ? output[0] : output;
        if (!resultImageUrl) throw new Error('FLUX model returned no image URL');

        const imageResponse = await fetch(resultImageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        return res.status(200).json({
          success: true,
          image: `data:image/png;base64,${base64Image}`,
          isMock: false,
          promptUsed: finalPromptForFlux
        });
      } catch (error) {
        console.error('[VERCEL OPENAI - REPLICATE FALLBACK ERROR]', error);
        return res.status(500).json({ 
          error: 'Replicate 대체 채널을 통한 OpenAI 파이프라인 생성 중 오류가 발생했습니다.', 
          details: error.message 
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Replicate API Mode (flux-kontext-pro or qwen-image-edit-plus)
  // -------------------------------------------------------------
  if (targetModel === 'replicate_flux' || targetModel === 'replicate_qwen') {
    try {
      const modelName = targetModel === 'replicate_qwen' ? 'qwen/qwen-image-edit-plus' : 'black-forest-labs/flux-kontext-pro';
      console.log(`[VERCEL REPLICATE] Running ${modelName}. Style: ${selectedStyle}, Gender: ${selectedGender}`);
      console.log(`[VERCEL REPLICATE] Prompt: "${finalPrompt}"`);

      let inputPayload = {};
      if (targetModel === 'replicate_qwen') {
        inputPayload = {
          image: [image],
          prompt: finalPrompt,
          go_fast: true,
          aspect_ratio: 'match_input_image',
          output_format: 'png',
          output_quality: 95
        };
      } else {
        // Default to black-forest-labs/flux-kontext-pro
        inputPayload = {
          input_image: image,
          prompt: finalPrompt,
          aspect_ratio: 'match_input_image',
          output_format: 'png',
          safety_tolerance: 2,
          prompt_upsampling: false
        };
      }

      const prediction = await createPredictionWithRetry(
        modelName,
        inputPayload,
        replicateToken
      );
      console.log(`[VERCEL REPLICATE] Prediction created with ID: ${prediction.id}. Polling...`);

      const output = await pollReplicatePrediction(prediction.id, replicateToken);
      const resultImageUrl = Array.isArray(output) ? output[0] : output;

      if (!resultImageUrl) {
        throw new Error(`Replicate ${modelName} did not return any output image URL.`);
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
        image: `data:image/png;base64,${base64Image}`,
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
  // Google Gemini API Mode (Imagen 4 + Gemini 2.5 Flash Pipeline)
  // -------------------------------------------------------------
  if (targetModel === 'gemini_imagen') {
    if (hasGemini) {
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
    } else {
      // Replicate Fallback (Llama 3.2 Vision VLM + Replicate FLUX)
      try {
        console.log(`[VERCEL GEMINI - REPLICATE FALLBACK] Running Replicate Fallback for Gemini + Imagen 4`);
        const faceDescription = await analyzeImageWithReplicateVLM(image, selectedGender, replicateToken);
        console.log(`[VERCEL GEMINI - REPLICATE FALLBACK] Face Analysis: ${faceDescription}`);

        const finalPromptForFlux = `${stylePrompt}, a caricature of: ${faceDescription}. ${translatedPrompt || ''}`;
        console.log(`[VERCEL GEMINI - REPLICATE FALLBACK] Sending prompt to FLUX: ${finalPromptForFlux}`);

        const prediction = await createPredictionWithRetry(
          'black-forest-labs/flux-kontext-pro',
          {
            input_image: image,
            prompt: finalPromptForFlux,
            aspect_ratio: 'match_input_image',
            output_format: 'png',
            safety_tolerance: 2,
            prompt_upsampling: false
          },
          replicateToken
        );
        const output = await pollReplicatePrediction(prediction.id, replicateToken);
        const resultImageUrl = Array.isArray(output) ? output[0] : output;
        if (!resultImageUrl) throw new Error('FLUX model returned no image URL');

        const imageResponse = await fetch(resultImageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        return res.status(200).json({
          success: true,
          image: `data:image/png;base64,${base64Image}`,
          isMock: false,
          promptUsed: finalPromptForFlux
        });
      } catch (error) {
        console.error('[VERCEL GEMINI - REPLICATE FALLBACK ERROR]', error);
        return res.status(500).json({ 
          error: 'Replicate 대체 채널을 통한 Gemini 파이프라인 생성 중 오류가 발생했습니다.', 
          details: error.message 
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Stability AI Mode (Stable Diffusion XL Image-to-Image)
  // -------------------------------------------------------------
  if (targetModel === 'stability_sdxl') {
    if (hasStability) {
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
    } else {
      // Replicate Fallback (Replicate 상의 stability-ai/sdxl 이미지 변환)
      try {
        console.log(`[STABILITY AI - VERCEL REPLICATE FALLBACK] Running Replicate Fallback for Stability SDXL`);
        
        const prediction = await createPredictionWithRetry(
          '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          {
            image: image,
            prompt: finalPrompt,
            negative_prompt: 'blurry, low quality, photorealistic, realistic, photograph, photo, bad anatomy, deformed face, disfigured, extra limbs, bad proportions',
            prompt_strength: 0.35,
            guidance_scale: 8,
            num_outputs: 1,
            scheduler: 'K_EULER',
            num_inference_steps: 30
          },
          replicateToken
        );
        const output = await pollReplicatePrediction(prediction.id, replicateToken);
        const resultImageUrl = Array.isArray(output) ? output[0] : output;
        if (!resultImageUrl) throw new Error('Replicate SDXL model returned no image URL');

        const imageResponse = await fetch(resultImageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        return res.status(200).json({
          success: true,
          image: `data:image/png;base64,${base64Image}`,
          isMock: false,
          promptUsed: finalPrompt
        });
      } catch (error) {
        console.error('[STABILITY AI - VERCEL REPLICATE FALLBACK ERROR]', error);
        return res.status(500).json({ 
          error: 'Replicate 대체 채널을 통한 Stability SDXL 생성 중 오류가 발생했습니다.', 
          details: error.message 
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Mock Mode Fallback (Simulated AI Generation)
  // -------------------------------------------------------------
  if (targetModel === 'mock') {
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

  return res.status(400).json({ error: `알 수 없는 생성 모델이 선택되었습니다: ${targetModel}` });
}
