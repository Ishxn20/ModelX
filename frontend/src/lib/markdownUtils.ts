export const preprocessMarkdown = (markdown: string): string => {
  let processed = markdown;

  processed = processed.replace(/```\s*([^\n`]+)\s*\n\s*\n?([^\n]*\|[^\n]*\|[^\n]*)\s*\n/gi, (match, label, tableLine) => {
    const columnCount = (tableLine.match(/\|/g) || []).length;
    if (columnCount >= 2 && tableLine.trim()) {
      const heading = label.trim() ? `### ${label.trim()}\n\n` : '';
      return `${heading}${tableLine}\n`;
    }
    return match;
  });

  processed = processed.replace(/```\s*([^\n`]+)\s*\n([^\n]*\|[^\n]*\|[^\n]*)\s*\n/gi, (match, label, tableLine) => {
    const columnCount = (tableLine.match(/\|/g) || []).length;
    if (columnCount >= 2 && tableLine.trim()) {
      const heading = label.trim() ? `### ${label.trim()}\n\n` : '';
      return `${heading}${tableLine}\n`;
    }
    return match;
  });

  processed = processed.replace(/```\s*\n\s*([^\n]*\|[^\n]*\|[^\n]*)\s*\n/gi, (match, tableLine) => {
    const columnCount = (tableLine.match(/\|/g) || []).length;
    if (columnCount >= 2 && tableLine.trim()) {
      return `${tableLine}\n`;
    }
    return match;
  });

  processed = processed.replace(/([^\n|`])\n([^\n]*\|[^\n]*\|[^\n]*)\s*\n/gi, (match, before, tableLine) => {
    const columnCount = (tableLine.match(/\|/g) || []).length;
    if (columnCount >= 2 && tableLine.trim() && !before.trim().endsWith(':')) {
      return `${before}\n\n${tableLine}\n`;
    }
    return match;
  });

  return processed;
};
