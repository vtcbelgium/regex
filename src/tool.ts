// src/tool.ts
// Pure TypeScript domain module for Regex Tester & Visual Explainer

export interface ToolResult {
  success: boolean;
  data: string;
  error?: string;
  warnings?: string[];
}

export interface MatchInfo {
  index: number;
  match: string;
  groups: string[];
}

export interface ParsedPattern {
  pattern: string;
  flags: string;
  tokens: TokenExplanation[];
}

export interface TokenExplanation {
  token: string;
  description: string;
  type: 'character-class' | 'quantifier' | 'anchor' | 'group' | 'escape' | 'other';
}

const PRESETS: Record<string, { pattern: string; flags: string; testString: string }> = {
  email: {
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    flags: '',
    testString: 'user@example.com\ninvalid-email\ntest.user@domain.co.uk'
  },
  ipv4: {
    pattern: '^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$',
    flags: '',
    testString: '192.168.1.1\n255.255.255.255\n999.999.999.999\n10.0.0.1'
  },
  url: {
    pattern: '^https?://(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:/[^\s]*)?$',
    flags: 'i',
    testString: 'https://example.com\nhttp://sub.domain.org/path\nftp://invalid.com\nhttps://test'
  },
  uuid: {
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    flags: 'i',
    testString: '550e8400-e29b-41d4-a716-446655440000\ninvalid-uuid\n6ba7b810-9dad-11d1-80b4-00c04fd430c8'
  },
  date: {
    pattern: '^\d{4}-\d{2}-\d{2}$',
    flags: '',
    testString: '2024-01-15\n2023-12-31\ninvalid-date\n2024/01/15'
  },
  slug: {
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    flags: 'i',
    testString: 'my-page-title\nMy-Page-Title\ninvalid slug\nanother-page-123'
  }
};

const TOKEN_EXPLANATIONS: Record<string, { description: string; type: TokenExplanation['type'] }> = {
  '\\d': { description: 'Digit (0-9)', type: 'character-class' },
  '\\D': { description: 'Non-digit', type: 'character-class' },
  '\\w': { description: 'Word character (a-z, A-Z, 0-9, _)', type: 'character-class' },
  '\\W': { description: 'Non-word character', type: 'character-class' },
  '\\s': { description: 'Whitespace (space, tab, newline)', type: 'character-class' },
  '\\S': { description: 'Non-whitespace', type: 'character-class' },
  '.': { description: 'Any character except newline', type: 'character-class' },
  '[abc]': { description: 'Character set: a, b, or c', type: 'character-class' },
  '[^abc]': { description: 'Negated character set: not a, b, or c', type: 'character-class' },
  '[a-z]': { description: 'Character range: a through z', type: 'character-class' },
  '*': { description: 'Zero or more (greedy)', type: 'quantifier' },
  '+': { description: 'One or more (greedy)', type: 'quantifier' },
  '?': { description: 'Zero or one (greedy)', type: 'quantifier' },
  '*?': { description: 'Zero or more (lazy)', type: 'quantifier' },
  '+?': { description: 'One or more (lazy)', type: 'quantifier' },
  '??': { description: 'Zero or one (lazy)', type: 'quantifier' },
  '{n}': { description: 'Exactly n times', type: 'quantifier' },
  '{n,}': { description: 'n or more times', type: 'quantifier' },
  '{n,m}': { description: 'Between n and m times', type: 'quantifier' },
  '^': { description: 'Start of string (or line with m flag)', type: 'anchor' },
  '$': { description: 'End of string (or line with m flag)', type: 'anchor' },
  '\\b': { description: 'Word boundary', type: 'anchor' },
  '\\B': { description: 'Non-word boundary', type: 'anchor' },
  '(...)': { description: 'Capturing group', type: 'group' },
  '(?:...)': { description: 'Non-capturing group', type: 'group' },
  '(?=...)': { description: 'Positive lookahead', type: 'group' },
  '(?!...)': { description: 'Negative lookahead', type: 'group' },
  '(?<=...)': { description: 'Positive lookbehind', type: 'group' },
  '(?<!...)': { description: 'Negative lookbehind', type: 'group' },
  '|': { description: 'Alternation (OR)', type: 'other' },
  '\\': { description: 'Escape special character', type: 'escape' }
};

export function parsePattern(pattern: string, flags: string): ParsedPattern {
  const tokens: TokenExplanation[] = [];
  let i = 0;
  
  while (i < pattern.length) {
    const char = pattern[i];
    let matched = false;
    
    // Check for escape sequences first
    if (char === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      const escapeSeq = '\\' + next;
      if (TOKEN_EXPLANATIONS[escapeSeq]) {
        tokens.push({ token: escapeSeq, ...TOKEN_EXPLANATIONS[escapeSeq] });
        i += 2;
        matched = true;
      }
    }
    
    // Check for quantifiers
    if (!matched && (char === '*' || char === '+' || char === '?')) {
      let quant = char;
      if (i + 1 < pattern.length && pattern[i + 1] === '?') {
        quant += '?';
        i++;
      }
      if (TOKEN_EXPLANATIONS[quant]) {
        tokens.push({ token: quant, ...TOKEN_EXPLANATIONS[quant] });
        i++;
        matched = true;
      }
    }
    
    // Check for brace quantifiers
    if (!matched && char === '{') {
      let j = i + 1;
      while (j < pattern.length && pattern[j] !== '}') j++;
      if (j < pattern.length) {
        const braceQuant = pattern.slice(i, j + 1);
        // Simplified - just mark as quantifier
        tokens.push({ token: braceQuant, description: 'Quantifier: ' + braceQuant, type: 'quantifier' });
        i = j + 1;
        matched = true;
      }
    }
    
    // Check for anchors and single-char tokens
    if (!matched && TOKEN_EXPLANATIONS[char]) {
      tokens.push({ token: char, ...TOKEN_EXPLANATIONS[char] });
      i++;
      matched = true;
    }
    
    // Check for groups
    if (!matched && char === '(') {
      let j = i + 1;
      let depth = 1;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '(') depth++;
        else if (pattern[j] === ')') depth--;
        j++;
      }
      if (depth === 0) {
        const group = pattern.slice(i, j);
        // Try to match known group types
        let found = false;
        for (const [key, val] of Object.entries(TOKEN_EXPLANATIONS)) {
          if (key.startsWith('(') && group.startsWith(key.slice(0, 3))) {
            tokens.push({ token: group, ...val });
            found = true;
            break;
          }
        }
        if (!found) {
          tokens.push({ token: group, description: 'Capturing group', type: 'group' });
        }
        i = j;
        matched = true;
      }
    }
    
    // Check for character classes
    if (!matched && char === '[') {
      let j = i + 1;
      let escaped = false;
      while (j < pattern.length) {
        if (pattern[j] === '\\' && !escaped) {
          escaped = true;
        } else if (pattern[j] === ']' && !escaped) {
          break;
        } else {
          escaped = false;
        }
        j++;
      }
      if (j < pattern.length) {
        const charClass = pattern.slice(i, j + 1);
        tokens.push({ token: charClass, description: 'Character class: ' + charClass, type: 'character-class' });
        i = j + 1;
        matched = true;
      }
    }
    
    // Default: literal character
    if (!matched) {
      tokens.push({ token: char, description: 'Literal character: ' + char, type: 'other' });
      i++;
    }
  }
  
  return { pattern, flags, tokens };
}

export function testRegex(pattern: string, flags: string, testString: string): MatchInfo[] {
  try {
    const validFlags = 'gimsu';
    const cleanFlags = flags.split('').filter(f => validFlags.includes(f)).join('');
    const regex = new RegExp(pattern, cleanFlags);
    const matches: MatchInfo[] = [];
    let match;
    
    // Handle global flag for multiple matches
    if (flags.includes('g')) {
      while ((match = regex.exec(testString)) !== null) {
        matches.push({
          index: match.index,
          match: match[0],
          groups: match.slice(1)
        });
        // Prevent infinite loop on zero-width matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    } else {
      match = regex.exec(testString);
      if (match) {
        matches.push({
          index: match.index,
          match: match[0],
          groups: match.slice(1)
        });
      }
    }
    
    return matches;
  } catch (e) {
    throw new Error(`Invalid regex: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function formatOutput(parsed: ParsedPattern, matches: MatchInfo[], testString: string): string {
  const lines: string[] = [];
  
  lines.push('=== REGEX PATTERN ===');
  lines.push(`Pattern: /${parsed.pattern}/${parsed.flags}`);
  lines.push('');
  
  lines.push('=== TOKEN EXPLANATION ===');
  if (parsed.tokens.length === 0) {
    lines.push('(no tokens recognized)');
  } else {
    for (const token of parsed.tokens) {
      lines.push(`  ${token.token.padEnd(15)} â ${token.description} [${token.type}]`);
    }
  }
  lines.push('');
  
  lines.push('=== TEST STRING ===');
  lines.push(testString);
  lines.push('');
  
  lines.push('=== MATCHES ===');
  if (matches.length === 0) {
    lines.push('(no matches found)');
  } else {
    for (const m of matches) {
      lines.push(`Match at index ${m.index}: "${m.match}"`);
      if (m.groups.length > 0) {
        for (let i = 0; i < m.groups.length; i++) {
          lines.push(`  Group ${i + 1}: "${m.groups[i]}"`);
        }
      }
    }
  }
  
  return lines.join('\n');
}

export function processInput(input: string): ToolResult {
  const warnings: string[] = [];
  
  try {
    // Parse input format: can be just a pattern, or pattern|flags|testString
    let pattern = '';
    let flags = '';
    let testString = '';
    
    const parts = input.split('|');
    if (parts.length === 1) {
      pattern = parts[0].trim();
      testString = '';
    } else if (parts.length === 2) {
      pattern = parts[0].trim();
      flags = parts[1].trim();
      testString = '';
    } else {
      pattern = parts[0].trim();
      flags = parts[1].trim();
      testString = parts.slice(2).join('|');
    }
    
    // Validate flags
    const validFlags = 'gimsu';
    for (const f of flags) {
      if (!validFlags.includes(f)) {
        warnings.push(`Unknown flag: ${f}`);
      }
    }
    const cleanFlags = flags.split('').filter(f => validFlags.includes(f)).join('');
    
    if (!pattern) {
      return {
        success: false,
        data: '',
        error: 'Pattern is required. Format: pattern|flags|testString'
      };
    }

    // Validate pattern syntax
    try {
      new RegExp(pattern, cleanFlags);
    } catch (err) {
      return {
        success: false,
        data: '',
        error: `Invalid regex: ${err instanceof Error ? err.message : String(err)}`
      };
    }
    
    const parsed = parsePattern(pattern, cleanFlags);
    
    let matches: MatchInfo[] = [];
    if (testString) {
      matches = testRegex(pattern, flags, testString);
    } else {
      warnings.push('No test string provided. Use format: pattern|flags|testString');
    }
    
    const output = formatOutput(parsed, matches, testString);
    
    return {
      success: true,
      data: output,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (e) {
    return {
      success: false,
      data: '',
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

export function getPresets(): Record<string, { pattern: string; flags: string; testString: string }> {
  return PRESETS;
}

export function applyPreset(name: string): { pattern: string; flags: string; testString: string } | null {
  return PRESETS[name] || null;
}

