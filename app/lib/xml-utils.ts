const PROPERTY_RE = /<property\s+name="([^"]+)"\s+value="([^"]*)"/g;

export function parseXmlProperties(xml: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const match of xml.matchAll(PROPERTY_RE)) {
    props[match[1]] = match[2];
  }
  return props;
}

export function applyXmlProperties(xml: string, updates: Record<string, string>): string {
  return xml.replace(PROPERTY_RE, (full, name: string, value: string) => {
    if (!(name in updates)) return full;
    const escaped = updates[name].replace(/"/g, '&quot;');
    return full.replace(`value="${value}"`, `value="${escaped}"`);
  });
}
