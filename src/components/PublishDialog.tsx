'use client';

import { useState, useEffect } from 'react';
import { publishToEzTutorial, getGitHubToken, setGitHubToken, verifyGitHubToken, EZTUTORIAL_CATEGORIES, DEFAULT_CATEGORY } from '@/lib/github';
import { addPublishRecord } from '@/lib/db';

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    content: string;
  } | null;
}

export default function PublishDialog({ isOpen, onClose, article }: PublishDialogProps) {
  const [token, setToken] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedToken, setSavedToken] = useState(false);

  useEffect(() => {
    const saved = getGitHubToken();
    if (saved) {
      setToken(saved);
      setSavedToken(true);
    }
  }, []);

  if (!isOpen || !article) return null;

  const handleSaveToken = async () => {
    setIsVerifying(true);
    setError('');
    
    const valid = await verifyGitHubToken(token);
    if (valid) {
      setGitHubToken(token);
      setSavedToken(true);
      setError('');
    } else {
      setError('Token 无效，请检查');
    }
    
    setIsVerifying(false);
  };

  const handlePublish = async () => {
    if (!token) {
      setError('请先输入 GitHub Token');
      return;
    }

    setIsPublishing(true);
    setError('');
    setSuccess('');

    const result = await publishToEzTutorial(token, article.title, article.content, {
      category,
    });

    if (result.success) {
      setSuccess(`发布成功！${result.url}`);
      
      // 记录发布历史
      await addPublishRecord({
        articleId: article.id,
        platform: 'eztutorial',
        publishedAt: new Date(),
        url: result.url,
        status: 'success',
      });

      // 3 秒后关闭
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 3000);
    } else {
      setError(result.error || '发布失败');
      
      // 记录失败
      await addPublishRecord({
        articleId: article.id,
        platform: 'eztutorial',
        publishedAt: new Date(),
        status: 'failed',
        error: result.error,
      });
    }

    setIsPublishing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50">
      <div className="bg-[#fffdf8] rounded-[8px] shadow-[0_24px_70px_rgba(43,36,24,0.22)] border border-[rgba(21,23,19,0.14)] w-[500px] max-w-[90vw]">
        <div className="p-4 border-b border-[rgba(21,23,19,0.14)] flex items-center justify-between">
          <h2 className="font-semibold text-lg text-[#151713]">发布到 EzTutorial</h2>
          <button onClick={onClose} className="text-[#62685f] hover:text-[#151713]">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Article Info */}
          <div className="bg-[#f1eadf] p-3 rounded-[8px] border border-[rgba(21,23,19,0.10)]">
            <div className="text-sm text-[#62685f]">文章标题</div>
            <div className="font-medium truncate">{article.title}</div>
          </div>

          {/* GitHub Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#151713]">
              GitHub Personal Access Token
              {savedToken && <span className="text-[#047a55] ml-2">✓ 已保存</span>}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-[rgba(21,23,19,0.14)] rounded-[8px] text-sm"
            />
            <p className="text-xs text-[#62685f]">
              Token 需要 repo 权限，<a href="https://github.com/settings/tokens" target="_blank" className="text-[#047a55] hover:underline">去创建</a>
            </p>
            
            <button
              onClick={handleSaveToken}
              disabled={!token || isVerifying}
              className="text-sm text-[#047a55] hover:text-[#035f43] disabled:opacity-50"
            >
              {isVerifying ? '验证中...' : '保存并验证 Token'}
            </button>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#151713]">
              文章分类
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(21,23,19,0.14)] rounded-[8px] text-sm"
            >
              {EZTUTORIAL_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.value}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Target Info */}
          <div className="text-sm text-[#62685f] bg-[#f1eadf] p-3 rounded-[8px] border border-[rgba(21,23,19,0.10)]">
            <div>目标仓库: <span className="font-mono">keepwonder/eztutorial</span></div>
            <div>文件路径: <span className="font-mono">posts/{article.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '')}.md</span></div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="text-sm text-red-700 bg-red-50 p-3 rounded-[8px] border border-red-100">{error}</div>
          )}
          {success && (
            <div className="text-sm text-[#047a55] bg-green-50 p-3 rounded-lg break-all">
              {success}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[rgba(21,23,19,0.14)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[rgba(21,23,19,0.18)] rounded-[8px] hover:bg-[#f1eadf]"
          >
            取消
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !token}
            className="flex-1 px-4 py-2 bg-[#bd6b1b] text-white rounded-[8px] hover:bg-[#8f4d35] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? '发布中...' : '发布到 EzTutorial'}
          </button>
        </div>
      </div>
    </div>
  );
}
