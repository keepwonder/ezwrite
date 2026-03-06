'use client';

import { useState, useEffect, useCallback } from 'react';
import { Article, createArticle, updateArticle, getAllArticles } from '@/lib/db';
import { md, preprocessMarkdown, applyTheme } from '@/lib/markdown';
import { makeWeChatCompatible, copyToClipboard } from '@/lib/wechat';
import { THEMES, THEME_GROUPS } from '@/lib/themes';

export default function Editor() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [themeId, setThemeId] = useState('ez-lemon');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  // Load articles on mount
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    const data = await getAllArticles();
    setArticles(data);
    if (data.length > 0 && !currentArticle) {
      selectArticle(data[0]);
    }
  };

  const selectArticle = (article: Article) => {
    setCurrentArticle(article);
    setTitle(article.title);
    setContent(article.content);
  };

  const createNewArticle = async () => {
    const article = await createArticle('未命名文章');
    await loadArticles();
    selectArticle(article);
  };

  // Auto-save
  useEffect(() => {
    if (!currentArticle) return;
    
    const timer = setTimeout(async () => {
      await updateArticle(currentArticle.id, { title, content });
      loadArticles();
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, currentArticle?.id]);

  // Update preview
  useEffect(() => {
    const processed = preprocessMarkdown(content);
    const html = md.render(processed);
    const themed = applyTheme(html, themeId);
    setPreviewHtml(themed);
  }, [content, themeId]);

  const handleCopyToWechat = async () => {
    const wechatHtml = await makeWeChatCompatible(previewHtml, themeId);
    const success = await copyToClipboard(wechatHtml);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white">
              ✍️
            </div>
            <span className="font-bold text-gray-800">EzWrite</span>
          </div>
          <button
            onClick={createNewArticle}
            className="w-full bg-yellow-500 text-white rounded-lg py-2 px-4 hover:bg-yellow-600 transition-colors"
          >
            + 新建文章
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {articles.map(article => (
            <button
              key={article.id}
              onClick={() => selectArticle(article)}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                currentArticle?.id === article.id ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
              }`}
            >
              <div className="font-medium text-gray-800 truncate">{article.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(article.updatedAt).toLocaleDateString('zh-CN')}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            className="flex-1 text-xl font-semibold bg-transparent border-none outline-none placeholder-gray-400"
          />

          <div className="flex items-center gap-4">
            {/* Theme Selector */}
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {THEME_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.themes.map(theme => (
                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Publish Button */}
            <button
              onClick={handleCopyToWechat}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCopied
                  ? 'bg-green-500 text-white'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isCopied ? '✓ 已复制' : '📋 复制到公众号'}
            </button>
          </div>
        </header>

        {/* Editor/Preview Tabs */}
        <div className="bg-gray-100 border-b border-gray-200 px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('write')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'write'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              写作
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preview'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              预览
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'write' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# 开始写作..."
              className="w-full h-full p-6 resize-none border-none outline-none font-mono text-sm leading-relaxed bg-white"
              spellCheck={false}
            />
          ) : (
            <div className="h-full overflow-y-auto p-6 bg-gray-100">
              <div
                className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
