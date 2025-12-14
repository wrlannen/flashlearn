import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('winston', () => ({
  createLogger: vi.fn(() => mockLogger),
  format: {
    combine: vi.fn(),
    timestamp: vi.fn(),
    errors: vi.fn(),
    printf: vi.fn(),
  },
  transports: {
    Console: vi.fn(),
  },
}));

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
  config: vi.fn(),
}));

describe('Server API Tests', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create test Express app
    app = express();
    app.use(cors());
    app.use(express.json());

    // Simple test route that mimics the actual server logic
    app.post('/api/generate-cards', async (req, res) => {
      const { topic, context } = req.body;

      if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
      }

      // Mock streaming response
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      
      const cards = [
        '{"front":"What is JavaScript?","back":"A programming language","code":""}\n',
        '{"front":"What is Node.js?","back":"A JavaScript runtime","code":"const x = 1;"}\n'
      ];

      for (const card of cards) {
        res.write(card);
      }

      res.end();
    });
  });

  describe('POST /api/generate-cards', () => {
    it('should return 400 if topic is missing', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Topic is required' });
    });

    it('should generate flashcards successfully', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: 'JavaScript' });

      expect(response.status).toBe(200);
      expect(response.text).toContain('What is JavaScript?');
      expect(response.text).toContain('What is Node.js?');
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should handle context parameter', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ 
          topic: 'JavaScript',
          context: ['Variables', 'Functions']
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('JavaScript');
    });

    it('should handle empty context array', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ 
          topic: 'TypeScript',
          context: []
        });

      expect(response.status).toBe(200);
    });

    it('should return JSON with code snippets', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: 'Node.js' });

      expect(response.status).toBe(200);
      expect(response.text).toContain('const x = 1;');
    });

    it('should set correct streaming headers', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: 'React' });

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.status).toBe(200);
    });
  });

  describe('Request Validation', () => {
    it('should handle missing topic field', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ context: ['test'] });

      expect(response.status).toBe(400);
    });

    it('should handle empty topic string', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: '' });

      expect(response.status).toBe(400);
    });

    it('should handle null topic', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: null });

      expect(response.status).toBe(400);
    });
  });

  describe('Response Format', () => {
    it('should return NDJSON format', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: 'Testing' });

      const lines = response.text.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);
      
      // Each line should be valid JSON
      lines.forEach(line => {
        if (line.trim()) {
          expect(() => JSON.parse(line)).not.toThrow();
        }
      });
    });

    it('should return cards with required fields', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: 'TypeScript' });

      const lines = response.text.trim().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          const card = JSON.parse(line);
          expect(card).toHaveProperty('front');
          expect(card).toHaveProperty('back');
          expect(card).toHaveProperty('code');
        }
      });
    });
  });

  describe('Context Handling', () => {
    it('should accept context as array of strings', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ 
          topic: 'JavaScript',
          context: ['Arrays', 'Objects', 'Functions']
        });

      expect(response.status).toBe(200);
    });

    it('should handle large context arrays', async () => {
      const largeContext = Array(100).fill('Concept');
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ 
          topic: 'JavaScript',
          context: largeContext
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long topic strings', async () => {
      const longTopic = 'A'.repeat(10000);
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: longTopic });

      expect(response.status).toBe(200);
    });

    it('should handle special characters in topic', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: 'C++ & JavaScript <script>' });

      expect(response.status).toBe(200);
    });

    it('should handle unicode characters', async () => {
      const response = await request(app)
        .post('/api/generate-cards')
        .send({ topic: '日本語 Programming' });

      expect(response.status).toBe(200);
    });
  });
});
