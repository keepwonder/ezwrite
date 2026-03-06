// GitHub API 集成 - 用于发布到 EzTutorial

const GITHUB_API_BASE = 'https://api.github.com';
const EZTUTORIAL_REPO = 'keepwonder/eztutorial';
const POSTS_PATH = 'posts';

interface GitHubFile {
  path: string;
  content: string;
  sha?: string;
}

// 将 Markdown 文章转换为 EzTutorial 格式
export function convertToEzTutorialFormat(
  title: string,
  content: string,
  meta?: {
    date?: string;
    tags?: string[];
    category?: string;
    description?: string;
  }
): string {
  const date = meta?.date || new Date().toISOString().split('T')[0];
  
  // 只使用 ASCII 字符生成 slug
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled';
  
  // 构建 front matter，避免空行
  const lines: string[] = [
    '---',
    `title: "${title}"`,
    `date: "${date}"`,
  ];
  
  if (meta?.tags && meta.tags.length > 0) {
    lines.push(`tags: [${meta.tags.map(t => `"${t}"`).join(', ')}]`);
  }
  
  if (meta?.category) {
    lines.push(`category: "${meta.category}"`);
  } else {
    lines.push('category: "技术"');
  }
  
  if (meta?.description) {
    lines.push(`description: "${meta.description}"`);
  }
  
  lines.push('---', '');

  return lines.join('\n') + content;
}

// 发布文章到 EzTutorial
export async function publishToEzTutorial(
  token: string,
  title: string,
  content: string,
  meta?: {
    date?: string;
    tags?: string[];
    category?: string;
    description?: string;
  }
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileContent = convertToEzTutorialFormat(title, content, meta);
    
    // 只使用 ASCII 字符生成文件名
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'untitled';
    
    const filename = `${slug}.md`;
    const path = `${POSTS_PATH}/${filename}`;

    // 1. 检查文件是否已存在（获取 SHA）
    let sha: string | undefined;
    try {
      const checkRes = await fetch(`${GITHUB_API_BASE}/repos/${EZTUTORIAL_REPO}/contents/${path}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (checkRes.ok) {
        const fileData = await checkRes.json();
        sha = fileData.sha;
      }
    } catch {
      // 文件不存在，继续创建
    }

    // 2. 创建或更新文件
    const commitMessage = sha 
      ? `docs: update ${title}`
      : `docs: add ${title}`;

    const body = {
      message: commitMessage,
      content: btoa(unescape(encodeURIComponent(fileContent))), // Base64 encode
      ...(sha && { sha }),
    };

    const res = await fetch(`${GITHUB_API_BASE}/repos/${EZTUTORIAL_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'GitHub API error');
    }

    const result = await res.json();
    
    return {
      success: true,
      url: result.content?.html_url || `https://github.com/${EZTUTORIAL_REPO}/blob/main/${path}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 获取 GitHub Token（从 localStorage 或提示用户输入）
export function getGitHubToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ezwrite_github_token');
}

export function setGitHubToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ezwrite_github_token', token);
}

export function removeGitHubToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ezwrite_github_token');
}

// 验证 GitHub Token
export async function verifyGitHubToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
