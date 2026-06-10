export const NOTE_RICH_TEXT_ATTRIBUTE = 'data-note-rich-text';
export const CHECKLIST_ATTRIBUTE = 'data-list-type';
export const CHECKLIST_VALUE = 'checklist';
export const CHECKED_ATTRIBUTE = 'data-checked';

const BLOCK_TAGS = new Set(['DIV', 'P']);
const INLINE_TAGS = new Set(['STRONG', 'U']);
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED']);

function createHtmlDocument(markup: string) {
  return new DOMParser().parseFromString(markup, 'text/html');
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeChildren(
  sourceParent: ParentNode,
  targetParent: HTMLElement,
  targetDocument: Document,
  inChecklist = false,
) {
  for (const childNode of Array.from(sourceParent.childNodes)) {
    const cleanNode = sanitizeNode(childNode, targetDocument, inChecklist);
    if (cleanNode) {
      targetParent.appendChild(cleanNode);
    }
  }
}

function sanitizeNode(node: ChildNode, targetDocument: Document, inChecklist: boolean): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return targetDocument.createTextNode(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toUpperCase();

  if (DROPPED_TAGS.has(tagName)) {
    return null;
  }

  if (tagName === 'BR') {
    return targetDocument.createElement('br');
  }

  if (tagName === 'B') {
    const strongElement = targetDocument.createElement('strong');
    sanitizeChildren(element, strongElement, targetDocument, inChecklist);
    return strongElement;
  }

  if (INLINE_TAGS.has(tagName)) {
    const cleanElement = targetDocument.createElement(tagName.toLowerCase());
    sanitizeChildren(element, cleanElement, targetDocument, inChecklist);
    return cleanElement;
  }

  if (BLOCK_TAGS.has(tagName)) {
    const cleanElement = targetDocument.createElement(tagName.toLowerCase());
    sanitizeChildren(element, cleanElement, targetDocument, inChecklist);
    return cleanElement;
  }

  if (tagName === 'UL') {
    const cleanList = targetDocument.createElement('ul');
    if (element.getAttribute(CHECKLIST_ATTRIBUTE) === CHECKLIST_VALUE) {
      cleanList.setAttribute(CHECKLIST_ATTRIBUTE, CHECKLIST_VALUE);
    }
    sanitizeChildren(element, cleanList, targetDocument, cleanList.getAttribute(CHECKLIST_ATTRIBUTE) === CHECKLIST_VALUE);
    return cleanList;
  }

  if (tagName === 'OL') {
    const cleanList = targetDocument.createElement('ol');
    sanitizeChildren(element, cleanList, targetDocument, false);
    return cleanList;
  }

  if (tagName === 'LI') {
    const cleanItem = targetDocument.createElement('li');
    if (inChecklist) {
      const isChecked = element.getAttribute(CHECKED_ATTRIBUTE) === 'true';
      cleanItem.setAttribute(CHECKED_ATTRIBUTE, isChecked ? 'true' : 'false');
    }
    sanitizeChildren(element, cleanItem, targetDocument, inChecklist);
    return cleanItem;
  }

  if (tagName === 'INPUT' && inChecklist && element.getAttribute('type') === 'checkbox') {
    return null;
  }

  const fragment = targetDocument.createDocumentFragment();
  for (const childNode of Array.from(element.childNodes)) {
    const cleanChild = sanitizeNode(childNode, targetDocument, inChecklist);
    if (cleanChild) {
      fragment.appendChild(cleanChild);
    }
  }

  return fragment;
}

function hasMeaningfulContent(rootElement: HTMLElement) {
  return (rootElement.textContent ?? '').replace(/\s+/g, '').length > 0;
}

function sanitizeRichTextFragment(fragmentHtml: string) {
  const sourceDocument = createHtmlDocument(fragmentHtml);
  const markedRoot = sourceDocument.body.querySelector(`[${NOTE_RICH_TEXT_ATTRIBUTE}="true"]`);
  const sourceRoot = markedRoot ?? sourceDocument.body;
  const targetDocument = sourceDocument.implementation.createHTMLDocument('note-rich-text');
  const cleanRoot = targetDocument.createElement('div');
  cleanRoot.setAttribute(NOTE_RICH_TEXT_ATTRIBUTE, 'true');

  if (!sourceRoot) {
    return '';
  }

  sanitizeChildren(sourceRoot, cleanRoot, targetDocument);

  if (!hasMeaningfulContent(cleanRoot)) {
    return '';
  }

  return cleanRoot.outerHTML;
}

function plainTextLineToHtml(line: string) {
  if (!line) {
    return '<div><br></div>';
  }

  return `<div>${escapeHtml(line)}</div>`;
}

function collectPlainText(node: Node, segments: string[], orderedListIndex = 1) {
  if (node.nodeType === Node.TEXT_NODE) {
    segments.push(node.textContent ?? '');
    return orderedListIndex;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return orderedListIndex;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toUpperCase();

  if (tagName === 'BR') {
    segments.push('\n');
    return orderedListIndex;
  }

  if (tagName === 'UL') {
    const isChecklist = element.getAttribute(CHECKLIST_ATTRIBUTE) === CHECKLIST_VALUE;
    for (const listItem of Array.from(element.children)) {
      if (listItem.tagName.toUpperCase() !== 'LI') {
        continue;
      }
      segments.push(isChecklist && listItem.getAttribute(CHECKED_ATTRIBUTE) === 'true' ? '☑ ' : isChecklist ? '☐ ' : '• ');
      collectPlainText(listItem, segments);
      segments.push('\n');
    }
    return orderedListIndex;
  }

  if (tagName === 'OL') {
    let currentIndex = 1;
    for (const listItem of Array.from(element.children)) {
      if (listItem.tagName.toUpperCase() !== 'LI') {
        continue;
      }
      segments.push(`${currentIndex}. `);
      collectPlainText(listItem, segments);
      segments.push('\n');
      currentIndex += 1;
    }
    return orderedListIndex;
  }

  for (const childNode of Array.from(element.childNodes)) {
    orderedListIndex = collectPlainText(childNode, segments, orderedListIndex);
  }

  if (BLOCK_TAGS.has(tagName) || tagName === 'LI') {
    segments.push('\n');
  }

  return orderedListIndex;
}

export function isRichTextNoteContent(noteText: string) {
  return noteText.includes(`${NOTE_RICH_TEXT_ATTRIBUTE}="true"`);
}

export function getNoteEditorHtml(noteText: string) {
  if (!noteText) {
    return '<div><br></div>';
  }

  if (isRichTextNoteContent(noteText)) {
    const sanitizedDocument = createHtmlDocument(sanitizeRichTextFragment(noteText));
    const rootElement = sanitizedDocument.body.querySelector(`[${NOTE_RICH_TEXT_ATTRIBUTE}="true"]`);
    return rootElement?.innerHTML || '<div><br></div>';
  }

  return noteText.split('\n').map(plainTextLineToHtml).join('');
}

export function serializeNoteRichText(editorHtml: string) {
  return sanitizeRichTextFragment(editorHtml);
}

export function getNoteDisplayHtml(noteText: string) {
  if (!noteText) {
    return '';
  }

  if (isRichTextNoteContent(noteText)) {
    const sanitizedDocument = createHtmlDocument(sanitizeRichTextFragment(noteText));
    const rootElement = sanitizedDocument.body.querySelector(`[${NOTE_RICH_TEXT_ATTRIBUTE}="true"]`);
    return rootElement?.innerHTML ?? '';
  }

  return noteText.split('\n').map(plainTextLineToHtml).join('');
}

export function getNotePreviewText(noteText: string) {
  if (!noteText) {
    return '';
  }

  if (!isRichTextNoteContent(noteText)) {
    return noteText;
  }

  const sanitizedDocument = createHtmlDocument(sanitizeRichTextFragment(noteText));
  const rootElement = sanitizedDocument.body.querySelector(`[${NOTE_RICH_TEXT_ATTRIBUTE}="true"]`);
  if (!rootElement) {
    return '';
  }

  const segments: string[] = [];
  collectPlainText(rootElement, segments);

  return segments.join('').replace(/\s+/g, ' ').trim();
}
