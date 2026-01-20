/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SpanData } from './index';

export const getSpanTimeRange = (span: SpanData): { start: number; end: number } | null => {
  if (!span.startTime || !span.endTime) return null;
  return {
    start: new Date(span.startTime).getTime(),
    end: new Date(span.endTime).getTime()
  };
};

export const timeContainsSpan = (parentSpan: SpanData, childSpan: SpanData): boolean => {
  const parentRange = getSpanTimeRange(parentSpan);
  const childRange = getSpanTimeRange(childSpan);

  if (!parentRange || !childRange) return false;

  // Parent contains child if it starts before/at and ends after/at, but they're not identical
  return parentRange.start <= childRange.start &&
    parentRange.end >= childRange.end &&
    (parentRange.start < childRange.start || parentRange.end > childRange.end);
};

export const sortSpansByUmbrellaFirst = (spans: SpanData[]): SpanData[] => {
  return [...spans].sort((a, b) => {
    const aRange = getSpanTimeRange(a);
    const bRange = getSpanTimeRange(b);

    if (!aRange || !bRange) return 0;

    const aContainsB = timeContainsSpan(a, b);
    const bContainsA = timeContainsSpan(b, a);

    if (aContainsB) return -1; // a comes first (umbrella)
    if (bContainsA) return 1;  // b comes first (umbrella)

    // Neither contains the other, sort by start time
    return aRange.start - bRange.start;
  });
};

export const formatDuration = (durationMs: number): string => {
  return durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(2)}s`;
};

export const getSpanDuration = (span: SpanData): number | null => {
  const range = getSpanTimeRange(span);
  return range ? range.end - range.start : null;
};

export const formatStartTime = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export const getSpanKindLabel = (kind: string | number): string => {
  if (typeof kind === 'string') {
    return kind;
  }
  const kindMap: { [key: number]: string } = {
    0: 'UNSPECIFIED',
    1: 'INTERNAL',
    2: 'SERVER',
    3: 'CLIENT',
    4: 'PRODUCER',
    5: 'CONSUMER'
  };
  return kindMap[kind] || `UNKNOWN(${kind})`;
};

export const stripSpanPrefix = (spanName: string): string => {
  const prefixes = ['invoke_agent ', 'execute_tool ', 'chat '];
  for (const prefix of prefixes) {
    if (spanName.startsWith(prefix)) {
      return spanName.substring(prefix.length);
    }
  }
  return spanName;
};

export const getSpanTypeBadge = (span: SpanData): 'invoke' | 'chat' | 'tool' | 'other' => {
  const operationName = span.attributes?.find(attr => attr.key === 'gen_ai.operation.name')?.value || '';
  if (operationName.startsWith('invoke_agent')) return 'invoke';
  if (operationName.startsWith('chat') || span.name.toLowerCase().startsWith('chat')) return 'chat';
  if (operationName.startsWith('execute_tool') || span.name.toLowerCase().startsWith('execute_tool')) return 'tool';
  return 'other';
};

export const spanHasError = (span: SpanData): boolean => {
  return span.attributes?.some(attr => attr.key === 'error.message' && attr.value) || false;
};

export const getSpanTokens = (span: SpanData): number => {
  const inputTokens = parseInt(span.attributes?.find(attr => attr.key === 'gen_ai.usage.input_tokens')?.value || '0');
  const outputTokens = parseInt(span.attributes?.find(attr => attr.key === 'gen_ai.usage.output_tokens')?.value || '0');
  return inputTokens + outputTokens;
};

export const isAISpan = (span: SpanData): boolean => {
  return span.attributes?.some(attr => attr.key === 'span.type' && attr.value === 'ai') || false;
};

export const extractUserErrorDetails = (text: string | null) => {
  if (typeof text !== "string") return null;

  const results = [];

  // Match body="...json..."
  const bodyRegex = /body="(\{[\s\S]*?\})"/g;
  let match;

  while ((match = bodyRegex.exec(text)) !== null) {
    try {
      // Unescape embedded quotes
      const jsonText = match[1].replace(/\\"/g, '"');
      const parsed = JSON.parse(jsonText);

      results.push({
        error_message: parsed.error_message,
        code: parsed.code,
        error_description: parsed.error_description,
        raw: parsed
      });
    } catch {
      // Ignore malformed bodies
    }
  }

  return results.length ? results : null;
}

export function fixJSONEscapes(str: string): string {
  // Escape all backslashes
  let result = str.replace(/\\/g, '\\\\');

  // Unescape valid JSON escape sequences
  // Valid: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
  result = result.replace(/\\\\\\(["\\/@bfnrt])/g, '\\$1');
  result = result.replace(/\\\\\\u([0-9a-fA-F]{4})/g, '\\u$1');

  return result;
}

export function tryParseJSON(str: string): any {
  const strategies = [
    // Strategy 1: Direct parse
    () => JSON.parse(str),

    // Strategy 2: With fixJSONEscapes
    () => JSON.parse(fixJSONEscapes(str)),

    // Strategy 3: Parse as relaxed JSON5-style (handles trailing commas, unquoted keys, etc)
    // This uses a simple technique: wrap in eval with proper safeguards
    () => {
      // Only try this if it looks like valid JSON structure
      if (!str.trim().match(/^[\[{]/)) throw new Error('Not JSON-like');

      // Use Function constructor as safer alternative to eval
      // This handles some relaxed JSON formats
      return JSON.parse(str
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/\n/g, '\\n')         // Escape literal newlines
        .replace(/\r/g, '\\r')         // Escape literal carriage returns
        .replace(/\t/g, '\\t')         // Escape literal tabs
      );
    }
  ];

  let lastError: any;
  for (const strategy of strategies) {
    try {
      return strategy();
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  throw lastError;
}

export function isJSONString(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();

  // Check for direct JSON objects/arrays
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      tryParseJSON(trimmed);
      return true;
    } catch (e) {
      console.error('JSON parse failed:', e, 'Input:', trimmed.substring(0, 100));
      return false;
    }
  }

  console.error('Not detected as JSON. Starts with:', trimmed.substring(0, 20));
  return false;
}

export function parseNestedJSON(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (isJSONString(trimmed)) {
      try {
        const parsed = tryParseJSON(trimmed);
        return parseNestedJSON(parsed);
      } catch (e) {
        console.error('Failed to parse nested JSON:', e, 'Value:', trimmed.substring(0, 100));
        return value;
      }
    }
  }
  if (Array.isArray(value)) {
    return value.map(item => parseNestedJSON(item));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = parseNestedJSON(val);
    }
    return result;
  }
  return value;
}

export const getSpanLabel = (type: string) => {
  switch (type) {
    case 'invoke': return 'Invoke Agent';
    case 'chat': return 'Chat';
    case 'tool': return 'Execute Tool';
    default: return 'Operation';
  }
};
