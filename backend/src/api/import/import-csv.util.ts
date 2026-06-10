const CSV_BOM = /^\uFEFF/;

export type ParsedCsv = {
  delimiter: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

export function parseCsvText(text: string): ParsedCsv {
  const normalizedText = text.replace(CSV_BOM, '');
  const delimiter = detectDelimiter(normalizedText);
  const csvRows = parseCsvRows(normalizedText, delimiter);
  const [headerRow, ...dataRows] = csvRows;

  if (!headerRow) {
    return { delimiter, headers: [], rows: [] };
  }

  const headers = headerRow.map((header) => header.trim()).filter(Boolean);
  const rows = dataRows
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [
          header,
          row[index] == null ? '' : row[index],
        ]),
      ),
    )
    .filter((row) =>
      Object.values(row).some((value) => String(value ?? '').trim().length > 0),
    );

  return { delimiter, headers, rows };
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (!isQuoted && char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!isQuoted && (char === '\n' || char === '\r')) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';

      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolonCount = countDelimiter(firstLine, ';');
  const commaCount = countDelimiter(firstLine, ',');
  const tabCount = countDelimiter(firstLine, '\t');

  if (tabCount > semicolonCount && tabCount > commaCount) {
    return '\t';
  }

  return semicolonCount >= commaCount ? ';' : ',';
}

function countDelimiter(value: string, delimiter: string): number {
  let count = 0;
  let isQuoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"') {
      isQuoted = !isQuoted;
    } else if (!isQuoted && char === delimiter) {
      count += 1;
    }
  }

  return count;
}
