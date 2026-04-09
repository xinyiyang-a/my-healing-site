# 疗愈空间 · Midjourney 360° 全景提示词

## 使用方法
1. 将以下提示词直接粘贴到 Midjourney 对话框
2. 参数固定用 `--ar 2:1 --tile --style raw --v 6.1`
3. 生成后在 Midjourney 点击 U1~U4 放大你最喜欢的版本
4. 下载图片，重命名为对应的文件名（如 `fuchun.jpg`）
5. 将图片和 healing-360.html 放在同一文件夹

---

## 场景一：富春山居

**文件名：** `fuchun.jpg`

```
360 degrees equirectangular panorama, Chinese ink wash painting style, Fuchun Mountain landscape, ancient Chinese horizontal scroll painting atmosphere, wide river surface reflecting moonlight, misty distant mountains in layered ink wash gradients, sparse pine trees silhouette, lone fishing boat, heavy morning mist, extremely minimal composition, large empty negative space, monochromatic ink tones from pale grey to deep charcoal, zen tranquility, no people, panoramic horizon line at vertical center, top and bottom areas fade to near-white mist --ar 2:1 --tile --style raw --v 6.1
```

---

## 场景二：云山禅境

**文件名：** `yunshan.jpg`

```
360 degrees equirectangular panorama, extreme minimalist Chinese ink brush painting, single towering mountain peak emerging from dense cloud sea, zen empty space, enormous white negative space, ink wash clouds flowing around mountain, ancient twisted pine tree on rocky cliff, moonlight through clouds, ultra-sparse composition, 90% empty white space, deep black ink strokes, traditional Chinese shanshui painting, no color only ink, meditative stillness, horizon centered vertically, edges fade to white mist --ar 2:1 --tile --style raw --v 6.1
```

---

## 场景三：溪山行旅

**文件名：** `xishan.jpg`

```
360 degrees equirectangular panorama, Chinese ink landscape painting, mountain stream winding through misty forest valley, ancient stone arch bridge, layered mountain ridges fading into distance, soft morning light filtering through bamboo grove, low saturation pale ink wash palette, green-grey tones, soft diffused light, dewdrops on leaves, mossy stones in stream, serene and quiet atmosphere, traditional Song dynasty landscape painting style, horizon centered, top and bottom fade to pale mist --ar 2:1 --tile --style raw --v 6.1
```

---

## 场景四：听雨轩窗

**文件名：** `tingyu.jpg`

```
360 degrees equirectangular panorama, Chinese classical garden in gentle rain, Suzhou garden lattice window view, lotus pond with rain ripples, banana leaf in rain, curved covered walkway, stone lantern, moongate doorway, rainy night atmosphere, deep blue-grey ink palette, rain streaks visible, misty wet garden, soft candlelight glow from interior, traditional Ming dynasty garden architecture, contemplative and quiet mood, horizon centered vertically, dark rainy sky at top, reflective wet ground at bottom --ar 2:1 --tile --style raw --v 6.1
```

---

## 场景五：笔墨静心

**文件名：** `bimo.jpg`

```
360 degrees equirectangular panorama, traditional Chinese Ming dynasty study room interior, warm candlelight, writing brush and ink stone on wooden desk, Chinese calligraphy scroll on wall, bamboo shadow pattern through rice paper window, incense smoke rising, antique bookshelf with ancient books, warm amber and dark wood tones, quiet scholarly atmosphere, low warm lighting, bamboo grove visible outside window, extremely detailed and atmospheric, horizon at desk level, ceiling above and floor below --ar 2:1 --tile --style raw --v 6.1
```

---

## 场景六：兰亭曲水

**文件名：** `lanting.jpg`

```
360 degrees equirectangular panorama, Chinese classical garden bamboo forest, winding stream with fallen petals floating, ancient stone table and seats beside water, bamboo grove in all directions creating tunnel effect, dappled sunlight through bamboo leaves, cherry blossom petals drifting in water, lush green bamboo stems filling scene, tranquil and joyful atmosphere, soft natural light, traditional Eastern garden aesthetic, pale green and white palette, horizon centered, bamboo canopy above water below --ar 2:1 --tile --style raw --v 6.1
```

---

## 图片处理建议

生成后需要做简单处理：
1. **尺寸**：确认是 2:1 比例（如 4096×2048 或 6000×3000）
2. **接缝**：在 Photoshop 用 `滤镜 → 其他 → 位移` 水平移动 50%，检查左右是否无缝衔接
3. **顶底**：顶部（天空）和底部（地面）用 Gaussian Blur 20px 模糊，避免球形映射时的拉伸感
4. **导入**：放入网站文件夹，文件名和代码中保持一致

## 备选生图工具（效果更好）

| 工具 | 特点 | 地址 |
|------|------|------|
| Blockade Labs Skybox | 专门做 360° AI skybox，一键生成 | skybox.blockadelabs.com |
| Stability AI 360° | API 方式，可批量 | stability.ai |
| DALL-E 3 + 手工接缝 | 生成普通图后用 Photoshop 拼接 | |
