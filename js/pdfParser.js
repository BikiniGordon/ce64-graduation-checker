// pdfParser.js
// Extracts text lines from a KMITL unofficial-transcript PDF using pdf.js.
// The transcript is a two-column table; we split items by x-position into a
// left and right column, group items into rows by y-position, then emit the
// left column top->bottom followed by the right column (matching the
// "Continue next column" reading order).

/* global pdfjsLib */

// Point pdf.js at its worker (CDN build loaded in index.html).
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/**
 * @param {ArrayBuffer} arrayBuffer  Raw bytes of the uploaded PDF.
 * @returns {Promise<string[]>}      One string per visual text line, in reading order.
 */
async function extractTranscriptLines(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const pageMidX = viewport.width / 2;
    const content = await page.getTextContent();

    // Collect positioned text items. pdf.js transform: [a,b,c,d,e,f] -> x=e, y=f.
    const items = content.items
      .filter((it) => it.str && it.str.trim() !== '')
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
      }));

    const left = items.filter((it) => it.x < pageMidX);
    const right = items.filter((it) => it.x >= pageMidX);

    allLines.push(...groupIntoLines(left));
    allLines.push(...groupIntoLines(right));
  }

  return allLines;
}

/**
 * Group positioned items into text lines by y-proximity, ordered top->bottom
 * and left->right within a line.
 * @param {{str:string,x:number,y:number}[]} items
 * @returns {string[]}
 */
function groupIntoLines(items) {
  if (items.length === 0) return [];
  const Y_TOLERANCE = 3; // items within 3px of y are on the same visual line

  // Sort top->bottom (PDF y grows upward, so descending y = top first).
  const sorted = items.slice().sort((a, b) => b.y - a.y);

  const lines = [];
  let current = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const it = sorted[i];
    if (Math.abs(it.y - currentY) <= Y_TOLERANCE) {
      current.push(it);
    } else {
      lines.push(flushLine(current));
      current = [it];
      currentY = it.y;
    }
  }
  lines.push(flushLine(current));
  return lines;
}

function flushLine(lineItems) {
  return lineItems
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((it) => it.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

window.extractTranscriptLines = extractTranscriptLines;
