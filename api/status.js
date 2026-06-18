import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default async function handler(req, res) {
  // Setup CORS Headers
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: '작업 ID(id)가 필요합니다.' });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken || replicateToken === 'YOUR_REPLICATE_API_TOKEN_HERE') {
    return res.status(500).json({ error: '서버의 Replicate 토큰 설정이 유효하지 않습니다.' });
  }

  try {
    // 1. Fetch prediction status from Replicate
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Replicate API returned status ${response.status}: ${errText}`);
    }

    const prediction = await response.json();
    const status = prediction.status; // 'starting', 'processing', 'succeeded', 'failed', 'canceled'

    console.log(`[VERCEL STATUS] Polling ID: ${id}, Status: ${status}`);

    // 2. If completed successfully, download image and convert to Base64
    if (status === 'succeeded') {
      const resultImageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      
      if (!resultImageUrl) {
        throw new Error('Replicate에서 성공 응답을 보냈으나 출력 이미지 URL이 비어 있습니다.');
      }

      console.log(`[VERCEL STATUS] Downloading completed image: ${resultImageUrl}`);
      const imageResponse = await fetch(resultImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image from Replicate: ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');
      const mimeType = 'image/png'; // Default to png for Replicate output

      return res.status(200).json({
        success: true,
        status: 'succeeded',
        image: `data:${mimeType};base64,${base64Image}`
      });
    }

    // 3. If failed or canceled
    if (status === 'failed' || status === 'canceled') {
      return res.status(200).json({
        success: false,
        status: status,
        error: prediction.error || 'AI 이미지 생성 작업이 실패했거나 취소되었습니다.'
      });
    }

    // 4. Otherwise (still running/queued)
    return res.status(200).json({
      success: true,
      status: status // 'starting' or 'processing'
    });

  } catch (error) {
    console.error(`[VERCEL STATUS ERROR]`, error.message);
    return res.status(500).json({
      error: '작업 상태를 확인하는 과정에서 에러가 발생했습니다.',
      details: error.message
    });
  }
}
