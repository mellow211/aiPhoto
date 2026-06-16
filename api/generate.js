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

  const apiKey = process.env.STABILITY_API_KEY;

  // -------------------------------------------------------------
  // Mock Mode: Run if no API key is set in Vercel environment
  // -------------------------------------------------------------
  if (!apiKey || apiKey === 'YOUR_STABILITY_API_KEY_HERE') {
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

  // -------------------------------------------------------------
  // Real API Mode: Stability AI Image-to-Image
  // -------------------------------------------------------------
  try {
    console.log(`[VERCEL REAL] Connecting to Stability AI. Style: ${selectedStyle}`);
    
    // Parse base64 init image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Build form data for API request
    const formData = new FormData();
    formData.append('init_image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'init_image.jpg');
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.35'); // Retain layout, shift style
    formData.append('text_prompts[0][text]', finalPrompt);
    formData.append('text_prompts[0][weight]', '1.0');
    
    // Negative prompt
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
