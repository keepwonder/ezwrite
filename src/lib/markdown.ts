'use client';

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { THEMES } from '@/lib/themes/index';

export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  highlight: function (str, lang) {
    let codeContent = '';
    if (lang && hljs.getLanguage(lang)) {
      try {
        codeContent = hljs.highlight(str, { language: lang }).value;
      } catch (__) {
        codeContent = md.utils.escapeHtml(str);
      }
    } else {
      codeContent = md.utils.escapeHtml(str);
    }

    const dots = '<div style="margin-bottom: 12px; white-space: nowrap;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ff5f56; margin-right: 6px;"></span><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e; margin-right: 6px;"></span><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #27c93f;"></span></div>';

    return `<pre>${dots}<code class="hljs">${codeContent}</code></pre>`;
  }
});

// 预处理 Markdown（来自 Raphael）
export function preprocessMarkdown(content: string) {
  content = content.replace(/^[ ]{0,3}(\*[ ]*\*[ ]*\*[\* ]*)[ \t]*$/gm, '***');
  content = content.replace(/^[ ]{0,3}(-[ ]*-[ ]*-[- ]*)[ \t]*$/gm, '---');
  content = content.replace(/^[ ]{0,3}(_[ ]*_[ ]*_[_ ]*)[ \t]*$/gm, '___');
  content = content.replace(/\*\*[ \t]+\*\*/g, ' ');
  content = content.replace(/\*{4,}/g, '');
  content = content.replace(
    /([^\s])\*\*([+\-＋－%％~～!！?？,，.。:：;；、\\/|@#￥$^&*_=（）()【】\[\]《》〈〉「」『』""\'`…·][^\n*]*?)\*\*/g,
    '$1**\u200B$2**'
  );
  return content;
}

// 应用主题（来自 Raphael，适配浏览器环境）
export function applyTheme(html: string, themeId: string) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const style = theme.styles;

  // 创建临时 DOM
  const container = document.createElement('div');
  container.innerHTML = html;

  // 处理多图排版
  const getSingleImageNode = (p: HTMLParagraphElement): HTMLElement | null => {
    const children = Array.from(p.childNodes).filter(n =>
      !(n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim()) &&
      !(n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === 'BR')
    );
    if (children.length !== 1) return null;
    const onlyChild = children[0];
    if (onlyChild.nodeName === 'IMG') return onlyChild as HTMLElement;
    if (onlyChild.nodeName === 'A' && onlyChild.childNodes.length === 1 && onlyChild.childNodes[0].nodeName === 'IMG') {
      return onlyChild as HTMLElement;
    }
    return null;
  };

  // 合并连续单图段落
  const paragraphSnapshot = Array.from(container.querySelectorAll('p'));
  for (const paragraph of paragraphSnapshot) {
    if (!paragraph.isConnected) continue;
    const parent = paragraph.parentElement;
    if (!parent) continue;
    if (!getSingleImageNode(paragraph)) continue;

    const run: HTMLParagraphElement[] = [paragraph];
    let cursor = paragraph.nextElementSibling;
    while (cursor && cursor.tagName === 'P') {
      const p = cursor as HTMLParagraphElement;
      if (!getSingleImageNode(p)) break;
      run.push(p);
      cursor = p.nextElementSibling;
    }

    if (run.length < 2) continue;

    for (let i = 0; i + 1 < run.length; i += 2) {
      const first = run[i];
      const second = run[i + 1];
      if (!first.isConnected || !second.isConnected) continue;

      const firstImageNode = getSingleImageNode(first);
      const secondImageNode = getSingleImageNode(second);
      if (!firstImageNode || !secondImageNode) continue;

      const gridParagraph = document.createElement('p');
      gridParagraph.classList.add('image-grid');
      gridParagraph.setAttribute('style', 'display: flex; justify-content: center; gap: 8px; margin: 24px 0; align-items: flex-start;');
      gridParagraph.appendChild(firstImageNode);
      gridParagraph.appendChild(secondImageNode);

      first.before(gridParagraph);
      first.remove();
      second.remove();
    }
  }

  // 处理图片网格
  container.querySelectorAll('p').forEach(p => {
    const children = Array.from(p.childNodes).filter(n => !(n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim()));
    const isAllImages = children.length > 1 && children.every(n => 
      n.nodeName === 'IMG' || (n.nodeName === 'A' && n.childNodes.length === 1 && n.childNodes[0].nodeName === 'IMG')
    );

    if (isAllImages) {
      p.classList.add('image-grid');
      p.setAttribute('style', 'display: flex; justify-content: center; gap: 8px; margin: 24px 0; align-items: flex-start;');

      p.querySelectorAll('img').forEach(img => {
        img.classList.add('grid-img');
        const w = 100 / children.length;
        img.setAttribute('style', `width: calc(${w}% - ${8 * (children.length - 1) / children.length}px); margin: 0; border-radius: 8px; height: auto;`);
      });
    }
  });

  // 应用主题样式
  Object.keys(style).forEach((selector) => {
    if (selector === 'pre code') return;
    if (selector === 'container') return;
    
    const elements = container.querySelectorAll(selector);
    elements.forEach(el => {
      if (selector === 'code' && el.parentElement?.tagName === 'PRE') return;
      if (el.tagName === 'IMG' && el.closest('.image-grid')) return;
      const currentStyle = el.getAttribute('style') || '';
      el.setAttribute('style', currentStyle + '; ' + style[selector as keyof typeof style]);
    });
  });

  // 恢复列表样式
  container.querySelectorAll('ul').forEach(ul => {
    const currentStyle = ul.getAttribute('style') || '';
    ul.setAttribute('style', `${currentStyle}; list-style-type: disc !important; list-style-position: outside;`);
  });
  container.querySelectorAll('ul ul').forEach(ul => {
    const currentStyle = ul.getAttribute('style') || '';
    ul.setAttribute('style', `${currentStyle}; list-style-type: circle !important;`);
  });
  container.querySelectorAll('ul ul ul').forEach(ul => {
    const currentStyle = ul.getAttribute('style') || '';
    ul.setAttribute('style', `${currentStyle}; list-style-type: square !important;`);
  });
  container.querySelectorAll('ol').forEach(ol => {
    const currentStyle = ol.getAttribute('style') || '';
    ol.setAttribute('style', `${currentStyle}; list-style-type: decimal !important; list-style-position: outside;`);
  });

  // 代码高亮样式内联
  const hljsLight: Record<string, string> = {
    'hljs-comment': 'color: #6a737d; font-style: italic;',
    'hljs-quote': 'color: #6a737d; font-style: italic;',
    'hljs-keyword': 'color: #d73a49; font-weight: 600;',
    'hljs-selector-tag': 'color: #d73a49; font-weight: 600;',
    'hljs-string': 'color: #032f62;',
    'hljs-title': 'color: #6f42c1; font-weight: 600;',
    'hljs-section': 'color: #6f42c1; font-weight: 600;',
    'hljs-type': 'color: #005cc5; font-weight: 600;',
    'hljs-number': 'color: #005cc5;',
    'hljs-literal': 'color: #005cc5;',
    'hljs-built_in': 'color: #005cc5;',
    'hljs-variable': 'color: #e36209;',
    'hljs-template-variable': 'color: #e36209;',
    'hljs-tag': 'color: #22863a;',
    'hljs-name': 'color: #22863a;',
    'hljs-attr': 'color: #6f42c1;',
  };

  container.querySelectorAll('.hljs span').forEach(span => {
    let inlineStyle = span.getAttribute('style') || '';
    if (inlineStyle && !inlineStyle.endsWith(';')) inlineStyle += '; ';
    span.classList.forEach(cls => {
      if (hljsLight[cls]) {
        inlineStyle += hljsLight[cls] + '; ';
      }
    });
    if (inlineStyle) {
      span.setAttribute('style', inlineStyle);
    }
  });

  // 标题内联元素样式修复
  const headingInlineOverrides: Record<string, string> = {
    strong: 'font-weight: 700; color: inherit !important; background-color: transparent !important;',
    em: 'font-style: italic; color: inherit !important; background-color: transparent !important;',
    a: 'color: inherit !important; text-decoration: none !important; border-bottom: 1px solid currentColor !important; background-color: transparent !important;',
    code: 'color: inherit !important; background-color: transparent !important; border: none !important; padding: 0 !important;',
  };

  container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    Object.keys(headingInlineOverrides).forEach(tag => {
      heading.querySelectorAll(tag).forEach(node => {
        const override = headingInlineOverrides[tag];
        node.setAttribute('style', `${node.getAttribute('style') || ''}; ${override}`);
      });
    });
  });

  // 统一图片样式
  container.querySelectorAll('img').forEach(img => {
    const inGrid = Boolean(img.closest('.image-grid'));
    const currentStyle = img.getAttribute('style') || '';
    const appendedStyle = inGrid
      ? 'display:block; max-width:100%; height:auto; margin:0 !important; padding:8px !important; border-radius:14px !important; box-sizing:border-box; box-shadow:0 12px 28px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.12); border:1px solid rgba(255,255,255,0.75);'
      : 'display:block; width:100%; max-width:100%; height:auto; margin:30px auto !important; padding:8px !important; border-radius:14px !important; box-sizing:border-box; box-shadow:0 16px 34px rgba(15,23,42,0.22), 0 4px 10px rgba(15,23,42,0.12); border:1px solid rgba(15,23,42,0.12);';
    img.setAttribute('style', `${currentStyle}; ${appendedStyle}`);
  });

  // 创建最终容器
  const wrapper = document.createElement('div');
  wrapper.setAttribute('style', style.container);
  wrapper.innerHTML = container.innerHTML;

  return wrapper.outerHTML;
}
