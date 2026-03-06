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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[500px] max-w-[90vw]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-lg">发布到 EzTutorial</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Article Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">文章标题</div>
            <div className="font-medium truncate">{article.title}</div>
          </div>

          {/* GitHub Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              GitHub Personal Access Token
              {savedToken && <span className="text-green-600 ml-2">✓ 已保存</span>}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500">
              Token 需要 repo 权限，<a href="https://github.com/settings/tokens" target="_blank" className="text-blue-600 hover:underline">去创建</a>
            </p>
            
            <button
              onClick={handleSaveToken}
              disabled={!token || isVerifying}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {isVerifying ? '验证中...' : '保存并验证 Token'}
            </button>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              文章分类
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {EZTUTORIAL_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.value}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Target Info */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <div>目标仓库: <span className="font-mono">keepwonder/eztutorial</span></div>
            <div>文件路径: <span className="font-mono">posts/{article.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '')}.md</span></div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}
          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg break-all">
              {success}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !token}
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? '发布中...' : '🚀 发布到 EzTutorial'}
          </button>
        </div>
      </div>
    </div>
  );
}
