import Dexie, { Table } from 'dexie';

export interface Article {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category?: string;
  status: 'draft' | 'published';
}

export interface PublishRecord {
  id?: number;
  articleId: string;
  platform: 'wechat' | 'eztutorial';
  publishedAt: Date;
  url?: string;
  status: 'success' | 'failed';
  error?: string;
}

export class EzWriteDB extends Dexie {
  articles!: Table<Article>;
  publishHistory!: Table<PublishRecord>;

  constructor() {
    super('EzWriteDB');
    this.version(1).stores({
      articles: 'id, title, updatedAt, status',
      publishHistory: '++id, articleId, platform, publishedAt',
    });
  }
}

export const db = new EzWriteDB();

// Article CRUD
export async function createArticle(title: string, content: string = ''): Promise<Article> {
  const article: Article = {
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    status: 'draft',
  };
  await db.articles.add(article);
  return article;
}

export async function getArticle(id: string): Promise<Article | undefined> {
  return await db.articles.get(id);
}

export async function updateArticle(id: string, changes: Partial<Article>): Promise<void> {
  await db.articles.update(id, {
    ...changes,
    updatedAt: new Date(),
  });
}

export async function deleteArticle(id: string): Promise<void> {
  await db.articles.delete(id);
}

export async function getAllArticles(): Promise<Article[]> {
  return await db.articles.orderBy('updatedAt').reverse().toArray();
}

export async function getRecentArticles(limit: number = 10): Promise<Article[]> {
  return await db.articles.orderBy('updatedAt').reverse().limit(limit).toArray();
}

// Publish History
export async function addPublishRecord(record: Omit<PublishRecord, 'id'>): Promise<void> {
  await db.publishHistory.add(record as PublishRecord);
}

export async function getPublishHistory(articleId: string): Promise<PublishRecord[]> {
  return await db.publishHistory
    .where('articleId')
    .equals(articleId)
    .reverse()
    .toArray();
}
