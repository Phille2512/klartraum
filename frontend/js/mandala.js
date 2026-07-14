const mandala = {
  ELEMENT_COLORS: { place: "#8fd49a", person: "#f5c66a", dream_sign: "#c9bfff" },

  async render(container) {
    const range = container.querySelector(".mandala-range")?.value || "month";
    const now = new Date();
    let from;
    if (range === "month") from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    else if (range === "quarter") from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    else from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const fromStr = from.toISOString().slice(0, 10);
    const toStr = now.toISOString().slice(0, 10);

    let data;
    try {
      data = await api.getMandala(fromStr, toStr);
    } catch (err) {
      showToast(err.message);
      return;
    }

    const svgEl = container.querySelector(".mandala-svg-wrap");
    if (!data.dreams.length) {
      svgEl.innerHTML = `<p class="hint">${t("mandala.empty")}</p>`;
      return;
    }

    const size = 600, cx = 300, cy = 300;

    // Deterministic hash
    const hash = (s) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return h;
    };

    // 1. Center: blend of top 2 emotions
    const emoEntries = Object.entries(data.emotion_totals).sort((a, b) => b[1] - a[1]);
    const emo1 = EMOTIONS[emoEntries[0]?.[0]]?.color || "#3a3c55";
    const emo2 = EMOTIONS[emoEntries[1]?.[0]]?.color || emo1;
    const lucidRatio = data.dreams.filter((d) => d.lucidity >= 3).length / data.dreams.length;
    const centerR = Math.round(24 + lucidRatio * 36);

    let svg = `<defs>
      <radialGradient id="center-grad">
        <stop offset="0%" stop-color="${emo1}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="${emo2}" stop-opacity="0.4"/>
      </radialGradient>
    </defs>`;

    svg += `<circle cx="${cx}" cy="${cy}" r="${centerR}" fill="url(#center-grad)" stroke="var(--accent)" stroke-width="1"/>`;

    // 2. Dream ring
    const dreamR = 120;
    data.dreams.forEach((d, i) => {
      const angle = (i / data.dreams.length) * Math.PI * 2 - Math.PI / 2;
      const jitter = (Math.abs(hash(d.date + d.emotions.length)) % 20 - 10) * 0.8;
      const r = dreamR + jitter;
      const dx = cx + Math.cos(angle) * r;
      const dy = cy + Math.sin(angle) * r;

      if (d.big_dream) {
        const s = 6;
        const star = `M${dx},${dy - s} L${dx + s * 0.4},${dy - s * 0.2} L${dx + s},${dy + s * 0.2} L${dx + s * 0.5},${dy + s * 0.6} L${dx + s * 0.6},${dy + s} L${dx},${dy + s * 0.7} L${dx - s * 0.6},${dy + s} L${dx - s * 0.5},${dy + s * 0.6} L${dx - s},${dy + s * 0.2} L${dx - s * 0.4},${dy - s * 0.2}Z`;
        svg += `<path d="${star}" fill="var(--lucid)" fill-opacity="0.9"/>`;
      } else if (d.lucidity >= 3) {
        svg += `<circle cx="${dx}" cy="${dy}" r="4" fill="var(--lucid)" fill-opacity="0.8"/>`;
      } else {
        svg += `<circle cx="${dx}" cy="${dy}" r="2.5" fill="var(--text-dim)" fill-opacity="0.5"/>`;
      }
    });

    // 3. Element wreath (petals)
    const elements = data.top_elements;
    if (elements.length) {
      const petalR = 200;
      elements.forEach((el, i) => {
        const angle = (i / elements.length) * Math.PI * 2 - Math.PI / 2;
        const len = 20 + Math.min(el.count, 10) * 4;
        const px = cx + Math.cos(angle) * petalR;
        const py = cy + Math.sin(angle) * petalR;
        const tx = cx + Math.cos(angle) * (petalR + len);
        const ty = cy + Math.sin(angle) * (petalR + len);
        const color = this.ELEMENT_COLORS[el.kind] || "#8fd49a";

        const cpx1 = cx + Math.cos(angle + 0.15) * (petalR + len * 0.6);
        const cpy1 = cy + Math.sin(angle + 0.15) * (petalR + len * 0.6);
        const cpx2 = cx + Math.cos(angle - 0.15) * (petalR + len * 0.6);
        const cpy2 = cy + Math.sin(angle - 0.15) * (petalR + len * 0.6);

        svg += `<path d="M${px},${py} Q${cpx1},${cpy1} ${tx},${ty} Q${cpx2},${cpy2} ${px},${py}Z"
          fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="0.8"/>`;

        const labelR = petalR + len + 10;
        const lx = cx + Math.cos(angle) * labelR;
        const ly = cy + Math.sin(angle) * labelR;
        const rot = (angle * 180 / Math.PI + 90) % 360;
        svg += `<text x="${lx}" y="${ly}" text-anchor="middle" fill="var(--text-dim)" font-size="8"
          transform="rotate(${rot > 90 && rot < 270 ? rot + 180 : rot},${lx},${ly})">${escapeHtml(el.name)}</text>`;
      });
    }

    // 4. Emotion band (outer arcs)
    if (emoEntries.length) {
      const bandR = 270;
      const total = emoEntries.reduce((s, e) => s + e[1], 0);
      let startAngle = -Math.PI / 2;
      emoEntries.forEach(([emo, count]) => {
        const sweep = (count / total) * Math.PI * 2;
        const endAngle = startAngle + sweep;
        const x1 = cx + Math.cos(startAngle) * bandR;
        const y1 = cy + Math.sin(startAngle) * bandR;
        const x2 = cx + Math.cos(endAngle) * bandR;
        const y2 = cy + Math.sin(endAngle) * bandR;
        const large = sweep > Math.PI ? 1 : 0;
        const color = EMOTIONS[emo]?.color || "#666";
        svg += `<path d="M${x1},${y1} A${bandR},${bandR} 0 ${large},1 ${x2},${y2}"
          fill="none" stroke="${color}" stroke-width="8" stroke-opacity="0.5" stroke-linecap="round"/>`;
        startAngle = endAngle;
      });
    }

    // Thin message for sparse data
    const sparse = data.dreams.length < 5
      ? `<p class="hint" style="text-align:center;margin-top:0.5rem">${t("mandala.sparse")}</p>`
      : "";

    svgEl.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="100%" class="mandala-svg">${svg}</svg>${sparse}`;

    // Export button
    const exportBtn = container.querySelector(".mandala-export");
    if (exportBtn) {
      exportBtn.onclick = () => this.exportPng(svgEl.querySelector("svg"), range);
    }
  },

  exportPng(svgEl, range) {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a1b2e";
    ctx.fillRect(0, 0, 1200, 1200);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1200, 1200);
      const a = document.createElement("a");
      a.download = `traum-mandala-${range}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  },
};
