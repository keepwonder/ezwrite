'use client';

import { useState, useEffect } from 'react';
import { Article, createArticle, updateArticle, getAllArticles } from '@/lib/db';
import { md, preprocessMarkdown, applyTheme } from '@/lib/markdown';
import { makeWeChatCompatible, copyToClipboard } from '@/lib/wechat';
import { THEMES, THEME_GROUPS } from '@/lib/themes';
import PublishDialog from './PublishDialog';

type ViewMode = 'both' | 'write' | 'preview';

export default function Editor() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [themeId, setThemeId] = useState('ez-lemon');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Load articles
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    const data = await getAllArticles();
    setArticles(data);
    if (data.length > 0 && !currentArticle) {
      selectArticle(data[0]);
    } else if (data.length === 0) {
      const article = await createArticle('欢迎使用 EzWrite', '# 开始写作\n\nEzWrite 是面向内容创作者的现代 Markdown 写作工作台。');
      setArticles([article]);
      selectArticle(article);
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

  // View mode button styles
  const viewModeBtn = (mode: ViewMode, label: string, icon: string) => (
    <button
      key={mode}
      onClick={() => setViewMode(mode)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
        viewMode === mode
          ? 'bg-[#151713] text-[#fffdf8]'
          : 'bg-[#fffdf8] text-[#62685f] hover:bg-[#f1eadf]'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f7f2e8] text-[#151713]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#fffdf8]/90 border-r border-[rgba(21,23,19,0.14)] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[rgba(21,23,19,0.14)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#151713] rounded-[8px] flex items-center justify-center text-[#f7f2e8] text-sm font-bold">
              W
            </div>
            <span className="font-bold text-gray-800 text-lg">EzWrite</span>
          </div>
          <button
            onClick={createNewArticle}
            className="w-full bg-[#151713] text-[#fffdf8] rounded-[8px] py-2 px-4 hover:bg-[#2a2d25] transition-colors font-medium"
          >
            + 新建文章
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {articles.map(article => (
            <button
              key={article.id}
              onClick={() => selectArticle(article)}
              className={`w-full text-left p-4 border-b border-[rgba(21,23,19,0.08)] hover:bg-[#f1eadf] transition-colors ${
                currentArticle?.id === article.id ? 'bg-[#f1eadf] border-l-4 border-l-[#047a55]' : ''
              }`}
            >
              <div className="font-medium text-[#151713] truncate">{article.title}</div>
              <div className="text-xs text-[#62685f] mt-1">
                {new Date(article.updatedAt).toLocaleDateString('zh-CN')}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <header className="bg-[#f7f2e8]/90 border-b border-[rgba(21,23,19,0.14)] px-4 py-3 flex items-center justify-between gap-4 backdrop-blur">
          {/* Left: Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            className="flex-1 text-xl font-semibold bg-transparent border-none outline-none placeholder-[#9a9588] min-w-0"
          />

          {/* Center: View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#fffdf8]/85 p-1 rounded-[8px] border border-[rgba(21,23,19,0.12)]">
            {viewModeBtn('both', '双栏', '◫')}
            {viewModeBtn('write', '写作', '✏️')}
            {viewModeBtn('preview', '预览', '👁')}
          </div>

          {/* Right: Theme & Publish */}
          <div className="flex items-center gap-3">
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="bg-[#fffdf8] border border-[rgba(21,23,19,0.14)] rounded-[8px] px-3 py-2 text-sm"
            >
              {THEME_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.themes.map(theme => (
                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <button
              onClick={handleCopyToWechat}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isCopied
                  ? 'bg-[#047a55] text-white'
                  : 'bg-[#047a55] text-white hover:bg-[#035f43]'
              }`}
            >
              {isCopied ? '✓ 已复制' : '📋 复制到公众号'}
            </button>

            <button
              onClick={() => setShowPublishDialog(true)}
              className="px-4 py-2 rounded-[8px] text-sm font-medium transition-colors whitespace-nowrap bg-[#bd6b1b] text-white hover:bg-[#8f4d35]"
            >
              🚀 发布到 EzTutorial
            </button>
          </div>
        </header>

        {/* Content Area - Dynamic based on view mode */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Panel */}
          {(viewMode === 'both' || viewMode === 'write') && (
            <div className={`${viewMode === 'both' ? 'w-1/2' : 'w-full'} flex flex-col border-r border-[rgba(21,23,19,0.14)]`}>
              <div className="bg-[#f1eadf] px-4 py-2 text-xs text-[#62685f] font-medium border-b border-[rgba(21,23,19,0.12)]">
                Markdown
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# 开始写作..."
                className="flex-1 w-full p-6 resize-none border-none outline-none font-mono text-sm leading-relaxed bg-[#fffdf8]"
                spellCheck={false}
              />
            </div>
          )}

          {/* Preview Panel */}
          {(viewMode === 'both' || viewMode === 'preview') && (
            <div className={`${viewMode === 'both' ? 'w-1/2' : 'w-full'} flex flex-col bg-[#f1eadf]`}>
              <div className="bg-[#f1eadf] px-4 py-2 text-xs text-[#62685f] font-medium border-b border-[rgba(21,23,19,0.12)]">
                预览
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div
                  className="max-w-3xl mx-auto bg-[#fffdf8] rounded-[8px] border border-[rgba(21,23,19,0.12)] shadow-[0_18px_48px_rgba(43,36,24,0.12)] p-8"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <footer className="bg-[#fffdf8]/90 border-t border-[rgba(21,23,19,0.14)] px-4 py-2 text-xs text-[#62685f] flex items-center justify-between">
          <div>
            {content.length} 字符 · {content.split(/\s+/).filter(w => w.length > 0).length} 词
          </div>
          <div>
            {currentArticle ? new Date(currentArticle.updatedAt).toLocaleString('zh-CN') : ''}
          </div>
        </footer>
      </main>

      {/* Publish Dialog */}
      <PublishDialog
        isOpen={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        article={currentArticle ? { id: currentArticle.id, title, content } : null}
      />
    </div>
  );
}
