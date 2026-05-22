export interface ParamDefinition {
  name: string;
  defaultValue: string;
}

export function normalizeParamName(name: string): string {
  return name.trim().replace(/[^\w]/g, '');
}

export function isValidParamName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/** Placeholders like {userId} in URL, body, headers JSON */
export function extractBracePlaceholders(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

/** Script references like data.email */
export function extractScriptDataRefs(script: string): string[] {
  const matches = script.match(/data\.(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace('data.', '')))];
}

export function collectHttpConfigRefs(config: {
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  headersText?: string;
  bodyText?: string;
}): string[] {
  const chunks: string[] = [config.url || ''];
  if (config.headers) chunks.push(JSON.stringify(config.headers));
  if (config.headersText) chunks.push(config.headersText);
  if (config.body !== undefined && config.body !== null) {
    chunks.push(
      typeof config.body === 'string' ? config.body : JSON.stringify(config.body)
    );
  }
  if (config.bodyText) chunks.push(config.bodyText);

  const refs = new Set<string>();
  chunks.forEach((c) => extractBracePlaceholders(c).forEach((p) => refs.add(p)));
  return [...refs];
}

export function validateParamUsage(
  defined: string[],
  used: string[]
): { unknown: string[]; unused: string[] } {
  const definedSet = new Set(defined);
  const usedSet = new Set(used);
  return {
    unknown: used.filter((p) => !definedSet.has(p)),
    unused: defined.filter((p) => !usedSet.has(p)),
  };
}

export function definitionsFromPairs(
  pairs: { key: string; value: string }[]
): { params: string[]; paramDefaults: Record<string, string> } {
  const params: string[] = [];
  const paramDefaults: Record<string, string> = {};
  pairs.forEach((pair) => {
    const name = normalizeParamName(pair.key);
    if (!name || !isValidParamName(name)) return;
    if (!params.includes(name)) params.push(name);
    paramDefaults[name] = pair.value;
  });
  return { params, paramDefaults };
}

export function pairsFromDefinitions(
  params?: string[],
  paramDefaults?: Record<string, string>
): { key: string; value: string }[] {
  if (!params?.length) return [{ key: '', value: '' }];
  return params.map((name) => ({
    key: name,
    value: paramDefaults?.[name] ?? '',
  }));
}

export function buildTestDataFromDefaults(
  paramDefaults: Record<string, string>
): Record<string, string> {
  const testData: Record<string, string> = {};
  Object.entries(paramDefaults).forEach(([k, v]) => {
    testData[k] = v.trim() || `sample-${k}`;
  });
  return testData;
}
