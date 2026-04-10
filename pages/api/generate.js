// pages/api/generate.js
// 后端接口：中文描述 → 阿里云万象文生图 → 返回图片URL
// 在后端调用，完全没有 CORS 问题

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { description } = req.body
  if (!description) return res.status(400).json({ error: '请提供场景描述' })

  const apiKey = process.env.ALIBABA_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API Key 未配置' })

  // 构建水墨风格提示词（中文直接给万象，效果更好）
  const prompt =
    `中国传统水墨山水画，${description}，` +
    `全景横幅构图，远山层叠，云雾弥漫，笔墨写意，留白禅意，` +
    `低饱和水墨色调，无文字，无人物，宁静疗愈氛围，高清细腻`

  try {
    // Step 1: 提交异步生图任务
    const submitResp = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'wanx2.1-t2i-turbo',
          input: {
            prompt,
            negative_prompt: '文字，水印，人物，logo，鲜艳色彩，写实照片，低质量',
          },
          parameters: {
            size: '1920*1024',
            n: 1,
          }
        })
      }
    )

    const submitData = await submitResp.json()
    if (!submitResp.ok || submitData.code) {
      console.error('提交失败:', submitData)
      return res.status(500).json({ error: submitData.message || '任务提交失败，请重试' })
    }

    const taskId = submitData.output?.task_id
    if (!taskId) return res.status(500).json({ error: '未获取到任务ID' })

    // Step 2: 轮询结果（最多 30 次 × 2秒 = 60秒）
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))

      const queryResp = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      )
      const queryData = await queryResp.json()
      const status = queryData.output?.task_status

      if (status === 'SUCCEEDED') {
        const url = queryData.output?.results?.[0]?.url
        if (!url) return res.status(500).json({ error: '未获取到图片URL' })
        return res.status(200).json({ url, prompt })
      }

      if (status === 'FAILED') {
        return res.status(500).json({ error: '图片生成失败，请重试' })
      }
      // PENDING / RUNNING 继续等
    }

    return res.status(500).json({ error: '生成超时，请稍后重试' })

  } catch (err) {
    console.error('generate error:', err)
    return res.status(500).json({ error: '服务出错，请稍后重试' })
  }
}
