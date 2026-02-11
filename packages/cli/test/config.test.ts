import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectProvider } from '../src/config.js';

describe('detectProvider', () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it('returns anthropic when explicitly requested with API key', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-test';
		const result = detectProvider('anthropic');
		expect(result.name).toBe('anthropic');
		expect(result.provider.name).toBe('anthropic');
	});

	it('throws when anthropic requested without API key', () => {
		delete process.env.ANTHROPIC_API_KEY;
		expect(() => detectProvider('anthropic')).toThrow('ANTHROPIC_API_KEY');
	});

	it('returns ollama when explicitly requested', () => {
		const result = detectProvider('ollama');
		expect(result.name).toBe('ollama');
		expect(result.provider.name).toBe('ollama');
	});

	it('throws on unknown provider name', () => {
		expect(() => detectProvider('openai')).toThrow('Unknown provider');
	});

	it('auto-detects anthropic from ANTHROPIC_API_KEY', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-test';
		delete process.env.OLLAMA_HOST;
		const result = detectProvider();
		expect(result.name).toBe('anthropic');
	});

	it('auto-detects ollama from OLLAMA_HOST', () => {
		delete process.env.ANTHROPIC_API_KEY;
		process.env.OLLAMA_HOST = 'http://192.168.1.100:11434';
		const result = detectProvider();
		expect(result.name).toBe('ollama');
	});

	it('defaults to ollama when no env vars set', () => {
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.OLLAMA_HOST;
		const result = detectProvider();
		expect(result.name).toBe('ollama');
	});

	it('prefers ANTHROPIC_API_KEY over OLLAMA_HOST when both set', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-test';
		process.env.OLLAMA_HOST = 'http://localhost:11434';
		const result = detectProvider();
		expect(result.name).toBe('anthropic');
	});
});
