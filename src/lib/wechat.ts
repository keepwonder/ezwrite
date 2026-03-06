'use client';

import { THEMES } from '@/lib/themes/index';

// 图片转 Base64
async function getBase64Image(imgUrl: string): Promise<string> {
  try {
    if (imgUrl.startsWith('data:')) return imgUrl;

    const response = await fetch(imgUrl, { mode: 'cors', cache: 'default' });
    if (!response.ok) return imgUrl;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(imgUrl);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return imgUrl;
  }
}

// 微信兼容性处理（核心引擎，来自 Raphael）
export async function makeWeChatCompatible(html: string, themeId: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const containerStyle = theme.styles.container || '';

  // 1. WeChat prefers <section> as the root wrapper for overall styling
  const rootNodes = Array.from(doc.body.children);
  const section = doc.createElement('section');
  section.setAttribute('style', containerStyle);

  rootNodes.forEach(node => {
    if (node.tagName === 'DIV' && rootNodes.length === 1) {
      Array.from(node.childNodes).forEach(child => section.appendChild(child));
    } else {
      section.appendChild(node);
    }
  });

  // 2. WeChat ignores flex in many scenarios. Convert image flex wrappers to table layout.
  const flexLikeNodes = section.querySelectorAll('div, p.image-grid');
  flexLikeNodes.forEach(node => {
    if (node.closest('pre, code')) return;

    const style = node.getAttribute('style') || '';
    const isFlexNode = style.includes('display: flex') || style.includes('display:flex');
    const isImageGrid = node.classList.contains('image-grid');
    if (!isFlexNode && !isImageGrid) return;

    const flexChildren = Array.from(node.children);
    if (flexChildren.every(child => child.tagName === 'IMG' || child.querySelector('img'))) {
      const table = doc.createElement('table');
      table.setAttribute('style', 'width: 100%; border-collapse: collapse; margin: 16px 0; border: none !important;');
      const tbody = doc.createElement('tbody');
      const tr = doc.createElement('tr');
      tr.setAttribute('style', 'border: none !important; background: transparent !important;');

      flexChildren.forEach(child => {
        const td = doc.createElement('td');
        td.setAttribute('style', 'padding: 0 4px; vertical-align: top; border: none !important; background: transparent !important;');
        td.appendChild(child);
        if (child.tagName === 'IMG') {
          const currentStyle = child.getAttribute('style') || '';
          child.setAttribute('style', currentStyle.replace(/width:\s*[^;]+;?/g, '') + ' width: 100% !important; display: block; margin: 0 auto;');
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
      table.appendChild(tbody);
      node.parentNode?.replaceChild(table, node);
    } else if (isFlexNode) {
      node.setAttribute('style', style.replace(/display:\s*flex;?/g, 'display: block;'));
    }
  });

  // 3. List Item Flattening
  const listItems = section.querySelectorAll('li');
  listItems.forEach(li => {
    const hasBlockChildren = Array.from(li.children).some(child =>
      ['P', 'DIV', 'UL', 'OL', 'BLOCKQUOTE'].includes(child.tagName)
    );
    if (hasBlockChildren) {
      const ps = li.querySelectorAll('p');
      ps.forEach(p => {
        const span = doc.createElement('span');
        span.innerHTML = p.innerHTML;
        const pStyle = p.getAttribute('style');
        if (pStyle) span.setAttribute('style', pStyle);
        p.parentNode?.replaceChild(span, p);
      });
    }
  });

  // 4. Force Inheritance - 字体强制内联
  const fontMatch = containerStyle.match(/font-family:\s*([^;]+);/);
  const sizeMatch = containerStyle.match(/font-size:\s*([^;]+);/);
  const colorMatch = containerStyle.match(/color:\s*([^;]+);/);
  const lineHeightMatch = containerStyle.match(/line-height:\s*([^;]+);/);

  const textNodes = section.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, span');
  textNodes.forEach(node => {
    if (node.tagName === 'SPAN' && node.closest('pre, code')) return;

    let currentStyle = node.getAttribute('style') || '';

    if (fontMatch && !currentStyle.includes('font-family:')) {
      currentStyle += ` font-family: ${fontMatch[1]};`;
    }
    if (lineHeightMatch && !currentStyle.includes('line-height:')) {
      currentStyle += ` line-height: ${lineHeightMatch[1]};`;
    }
    if (sizeMatch && !currentStyle.includes('font-size:') && ['P', 'LI', 'BLOCKQUOTE', 'SPAN'].includes(node.tagName)) {
      currentStyle += ` font-size: ${sizeMatch[1]};`;
    }
    if (colorMatch && !currentStyle.includes('color:')) {
      currentStyle += ` color: ${colorMatch[1]};`;
    }

    node.setAttribute('style', currentStyle.trim());
  });

  // 5. CJK punctuation handling
  const inlineNodes = section.querySelectorAll('strong, b, em, span, a, code');
  inlineNodes.forEach(node => {
    const next = node.nextSibling;
    if (!next || next.nodeType !== Node.TEXT_NODE) return;
    const text = next.textContent || '';
    const match = text.match(/^\s*([：；，。！？、:])(.*)$/s);
    if (!match) return;

    const punct = match[1];
    const rest = match[2] || '';
    node.appendChild(doc.createTextNode(punct));
    if (rest) {
      next.textContent = rest;
    } else {
      next.parentNode?.removeChild(next);
    }
  });

  // 6. Convert all images to Base64
  const imgs = Array.from(section.querySelectorAll('img'));
  await Promise.all(imgs.map(async img => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:')) {
      const base64 = await getBase64Image(src);
      img.setAttribute('src', base64);
    }
  }));

  doc.body.innerHTML = '';
  doc.body.appendChild(section);

  // Prevent WeChat from breaking lines
  let outputHtml = doc.body.innerHTML;
  outputHtml = outputHtml.replace(/(<\/(?:strong|b|em|span|a|code)>)\s*([：；，。！？、])/g, '$1\u2060$2');

  return outputHtml;
}

// 复制到剪贴板
export async function copyToClipboard(html: string): Promise<boolean> {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}
