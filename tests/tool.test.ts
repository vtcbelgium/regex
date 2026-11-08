// tests/tool.test.ts
import { describe, it, expect } from 'vitest';
import { processInput, getPresets, applyPreset, parsePattern, testRegex } from '../src/tool.ts';

describe('Regex Tester Tool', () => {
  describe('processInput', () => {
    it('should parse a simple pattern and return token explanations', () => {
      const result = processInput('\\d+');
      expect(result.success).toBe(true);
      expect(result.data).toContain('TOKEN EXPLANATION');
      expect(result.data).toContain('\\d');
      expect(result.data).toContain('Digit');
    });

    it('should handle pattern with flags and test string', () => {
      const result = processInput('hello|gi|Hello World\nHELLO');
      expect(result.success).toBe(true);
      expect(result.data).toContain('MATCHES');
      expect(result.data).toContain('Match at index');
    });

    it('should return error for empty pattern', () => {
      const result = processInput('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Pattern is required');
    });

    it('should warn about unknown flags', () => {
      const result = processInput('test|x|test');
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.[0]).toContain('Unknown flag: x');
    });

    it('should handle invalid regex pattern', () => {
      const result = processInput('[unclosed|');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid regex');
    });
  });

  describe('parsePattern', () => {
    it('should identify character classes', () => {
      const parsed = parsePattern('\\d\\w\\s.', '');
      const types = parsed.tokens.map(t => t.type);
      expect(types).toContain('character-class');
    });

    it('should identify quantifiers', () => {
      const parsed = parsePattern('a*b+c?', '');
      const quantTokens = parsed.tokens.filter(t => t.type === 'quantifier');
      expect(quantTokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should identify anchors', () => {
      const parsed = parsePattern('^$\\b', '');
      const anchorTokens = parsed.tokens.filter(t => t.type === 'anchor');
      expect(anchorTokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should identify groups', () => {
      const parsed = parsePattern('(abc)(?:def)(?=ghi)', '');
      const groupTokens = parsed.tokens.filter(t => t.type === 'group');
      expect(groupTokens.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('testRegex', () => {
    it('should find all matches with global flag', () => {
      const matches = testRegex('\\d+', 'g', 'abc 123 def 456');
      expect(matches.length).toBe(2);
      expect(matches[0].match).toBe('123');
      expect(matches[1].match).toBe('456');
    });

    it('should capture groups', () => {
      const matches = testRegex('(\\d+)-(\\d+)', '', '2024-01-15');
      expect(matches.length).toBe(1);
      expect(matches[0].groups).toEqual(['2024', '01']);
    });

    it('should return empty array for no matches', () => {
      const matches = testRegex('xyz', '', 'abc');
      expect(matches.length).toBe(0);
    });
  });

  describe('Presets', () => {
    it('should have all required presets', () => {
      const presets = getPresets();
      expect(presets.email).toBeDefined();
      expect(presets.ipv4).toBeDefined();
      expect(presets.url).toBeDefined();
      expect(presets.uuid).toBeDefined();
      expect(presets.date).toBeDefined();
      expect(presets.slug).toBeDefined();
    });

    it('should apply email preset correctly', () => {
      const preset = applyPreset('email');
      expect(preset).not.toBeNull();
      expect(preset?.pattern).toContain('@');
      expect(preset?.testString).toContain('user@example.com');
    });

    it('should return null for unknown preset', () => {
      const preset = applyPreset('unknown');
      expect(preset).toBeNull();
    });
  });
});

