import { Bold, List, ListChecks, ListOrdered, Underline } from "lucide-react";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/classnames";
import { AppButton } from "../ui/AppButton";
import {
  CHECKED_ATTRIBUTE,
  CHECKLIST_ATTRIBUTE,
  CHECKLIST_VALUE,
  getNoteEditorHtml,
  serializeNoteRichText,
} from "./noteRichText";

function getActiveSelection(editorElement: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editorElement.contains(anchorNode)) {
    return null;
  }

  return selection;
}

function getClosestElement(
  node: Node | null,
  selector: string,
  boundaryElement: HTMLElement,
) {
  let currentNode: Node | null = node;

  while (currentNode && currentNode !== boundaryElement) {
    if (currentNode instanceof HTMLElement && currentNode.matches(selector)) {
      return currentNode;
    }
    currentNode = currentNode.parentNode;
  }

  return null;
}

function setChecklistState(
  listElement: HTMLUListElement,
  checkedState: "true" | "false" = "false",
) {
  listElement.setAttribute(CHECKLIST_ATTRIBUTE, CHECKLIST_VALUE);

  for (const childElement of Array.from(listElement.children)) {
    if (!(childElement instanceof HTMLLIElement)) {
      continue;
    }

    if (!childElement.hasAttribute(CHECKED_ATTRIBUTE)) {
      childElement.setAttribute(CHECKED_ATTRIBUTE, checkedState);
    }
  }
}

function clearChecklistState(rootElement: HTMLElement) {
  for (const listElement of Array.from(
    rootElement.querySelectorAll(
      `ul[${CHECKLIST_ATTRIBUTE}="${CHECKLIST_VALUE}"]`,
    ),
  )) {
    listElement.removeAttribute(CHECKLIST_ATTRIBUTE);
  }

  for (const listItem of Array.from(
    rootElement.querySelectorAll(`li[${CHECKED_ATTRIBUTE}]`),
  )) {
    listItem.removeAttribute(CHECKED_ATTRIBUTE);
  }
}

function normalizeEditorDom(editorElement: HTMLElement) {
  for (const listElement of Array.from(editorElement.querySelectorAll("ul"))) {
    if (!(listElement instanceof HTMLUListElement)) {
      continue;
    }

    if (listElement.getAttribute(CHECKLIST_ATTRIBUTE) === CHECKLIST_VALUE) {
      setChecklistState(listElement);
      continue;
    }

    for (const listItem of Array.from(
      listElement.querySelectorAll(`li[${CHECKED_ATTRIBUTE}]`),
    )) {
      listItem.removeAttribute(CHECKED_ATTRIBUTE);
    }
  }

  for (const listItem of Array.from(
    editorElement.querySelectorAll(`ol li[${CHECKED_ATTRIBUTE}]`),
  )) {
    listItem.removeAttribute(CHECKED_ATTRIBUTE);
  }

  const serialized = serializeNoteRichText(editorElement.innerHTML);
  if (!serialized) {
    editorElement.innerHTML = "<div><br></div>";
  }

  editorElement.dataset.empty = editorElement.textContent?.trim()
    ? "false"
    : "true";
}

function isInlineFormatActive(
  editorElement: HTMLElement,
  selectionNode: Node | null,
  selector: string,
) {
  const matchingElement = getClosestElement(
    selectionNode,
    selector,
    editorElement,
  );
  return Boolean(matchingElement);
}

function getActiveFormattingState(
  editorElement: HTMLElement,
  pendingInlineFormatting?: { bold: boolean; underline: boolean } | null,
) {
  const selection = getActiveSelection(editorElement);
  const anchorNode = selection?.anchorNode ?? null;
  const unorderedList = getClosestElement(anchorNode, "ul", editorElement);
  const orderedList = getClosestElement(anchorNode, "ol", editorElement);
  const checklist =
    unorderedList instanceof HTMLUListElement &&
    unorderedList.getAttribute(CHECKLIST_ATTRIBUTE) === CHECKLIST_VALUE;
  const canUsePendingInlineFormatting = Boolean(
    pendingInlineFormatting && (!selection || selection.isCollapsed),
  );

  return {
    bold: canUsePendingInlineFormatting
      ? pendingInlineFormatting.bold
      : isInlineFormatActive(editorElement, anchorNode, "strong, b"),
    underline: canUsePendingInlineFormatting
      ? pendingInlineFormatting.underline
      : isInlineFormatActive(editorElement, anchorNode, "u"),
    unorderedList: unorderedList instanceof HTMLUListElement && !checklist,
    orderedList: orderedList instanceof HTMLOListElement,
    checklist,
  };
}

function insertPlainText(text: string) {
  if (typeof document.execCommand === "function") {
    document.execCommand("insertText", false, text);
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function NoteRichTextEditor({
  ariaLabel,
  describedBy,
  invalid = false,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  describedBy?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const labelId = useId();
  const hasHydratedRef = useRef(false);
  const lastSerializedValueRef = useRef(value);
  const pendingInlineFormattingRef = useRef<{
    bold: boolean;
    underline: boolean;
  } | null>(null);
  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
    checklist: false,
  });

  const syncActiveFormatting = () => {
    const editorElement = editorRef.current;
    if (!editorElement) {
      return;
    }

    setActiveFormatting(
      getActiveFormattingState(
        editorElement,
        pendingInlineFormattingRef.current,
      ),
    );
  };

  const emitChange = () => {
    const editorElement = editorRef.current;
    if (!editorElement) {
      return;
    }

    normalizeEditorDom(editorElement);
    const serialized = serializeNoteRichText(editorElement.innerHTML);
    lastSerializedValueRef.current = serialized;
    onChange(serialized);
  };

  useLayoutEffect(() => {
    const editorElement = editorRef.current;
    if (!editorElement) {
      return;
    }

    const nextEditorHtml = getNoteEditorHtml(value);

    if (hasHydratedRef.current && value === lastSerializedValueRef.current) {
      normalizeEditorDom(editorElement);
      syncActiveFormatting();
      return;
    }

    if (editorElement.innerHTML !== nextEditorHtml) {
      editorElement.innerHTML = nextEditorHtml;
    }

    lastSerializedValueRef.current = value;
    hasHydratedRef.current = true;
    pendingInlineFormattingRef.current = null;
    normalizeEditorDom(editorElement);
    syncActiveFormatting();
  }, [value]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const editorElement = editorRef.current;
      if (!editorElement) {
        return;
      }

      const selection = window.getSelection();
      if (
        !selection?.anchorNode ||
        !editorElement.contains(selection.anchorNode)
      ) {
        return;
      }

      if (!selection.isCollapsed) {
        pendingInlineFormattingRef.current = null;
      }

      syncActiveFormatting();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const applyCommand = (
    command: "bold" | "underline" | "insertUnorderedList" | "insertOrderedList",
  ) => {
    const editorElement = editorRef.current;
    if (!editorElement) {
      return;
    }

    const selection = getActiveSelection(editorElement);
    const preserveTypingMode =
      (command === "bold" || command === "underline") &&
      (!selection || selection.isCollapsed);
    const inlineCommandKey =
      command === "bold" || command === "underline" ? command : null;

    editorElement.focus();
    if (typeof document.execCommand === "function") {
      document.execCommand(command);
    }

    if (preserveTypingMode && inlineCommandKey) {
      const currentInlineFormatting = pendingInlineFormattingRef.current ?? {
        bold: activeFormatting.bold,
        underline: activeFormatting.underline,
      };

      pendingInlineFormattingRef.current = {
        ...currentInlineFormatting,
        [inlineCommandKey]: !currentInlineFormatting[inlineCommandKey],
      };
    } else if (inlineCommandKey) {
      pendingInlineFormattingRef.current = null;
    }

    if (command === "insertUnorderedList") {
      const listElement = getClosestElement(
        selection?.anchorNode ?? null,
        "ul",
        editorElement,
      );
      if (listElement instanceof HTMLUListElement) {
        listElement.removeAttribute(CHECKLIST_ATTRIBUTE);
        for (const listItem of Array.from(
          listElement.querySelectorAll(`li[${CHECKED_ATTRIBUTE}]`),
        )) {
          listItem.removeAttribute(CHECKED_ATTRIBUTE);
        }
      }
    }

    if (command === "insertOrderedList") {
      const listElement = getClosestElement(
        selection?.anchorNode ?? null,
        "ul",
        editorElement,
      );
      if (
        listElement instanceof HTMLUListElement &&
        listElement.getAttribute(CHECKLIST_ATTRIBUTE) === CHECKLIST_VALUE
      ) {
        clearChecklistState(listElement);
      }
    }

    if (!preserveTypingMode) {
      emitChange();
      syncActiveFormatting();
      return;
    }

    setActiveFormatting((current) => ({
      ...current,
      ...(pendingInlineFormattingRef.current ?? {}),
    }));
  };

  const applyChecklist = () => {
    const editorElement = editorRef.current;
    if (!editorElement) {
      return;
    }

    const selection = getActiveSelection(editorElement);
    const currentListElement = getClosestElement(
      selection?.anchorNode ?? null,
      "ul",
      editorElement,
    );

    editorElement.focus();

    if (
      currentListElement instanceof HTMLUListElement &&
      currentListElement.getAttribute(CHECKLIST_ATTRIBUTE) === CHECKLIST_VALUE
    ) {
      clearChecklistState(currentListElement);
      if (typeof document.execCommand === "function") {
        document.execCommand("insertUnorderedList");
      }
      emitChange();
      syncActiveFormatting();
      return;
    }

    if (currentListElement instanceof HTMLUListElement) {
      setChecklistState(currentListElement);
      emitChange();
      syncActiveFormatting();
      return;
    }

    if (typeof document.execCommand === "function") {
      document.execCommand("insertUnorderedList");
    }

    const listElement = getClosestElement(
      getActiveSelection(editorElement)?.anchorNode ?? null,
      "ul",
      editorElement,
    );
    if (listElement instanceof HTMLUListElement) {
      setChecklistState(listElement);
      emitChange();
      syncActiveFormatting();
      return;
    }

    if (typeof document.execCommand === "function") {
      document.execCommand(
        "insertHTML",
        false,
        `<ul ${CHECKLIST_ATTRIBUTE}="${CHECKLIST_VALUE}"><li ${CHECKED_ATTRIBUTE}="false"><br></li></ul>`,
      );
    }

    emitChange();
    syncActiveFormatting();
  };

  const handleToolbarMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    const shortcutKey = event.key.toLowerCase();
    if (shortcutKey === "b") {
      event.preventDefault();
      applyCommand("bold");
    }

    if (shortcutKey === "u") {
      event.preventDefault();
      applyCommand("underline");
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    insertPlainText(event.clipboardData.getData("text/plain"));
    emitChange();
    syncActiveFormatting();
  };

  const handleChecklistClick = (event: MouseEvent<HTMLDivElement>) => {
    const editorElement = editorRef.current;
    if (!editorElement || !(event.target instanceof HTMLElement)) {
      return;
    }

    const listItem = event.target.closest(`li[${CHECKED_ATTRIBUTE}]`);
    if (
      !(listItem instanceof HTMLLIElement) ||
      !editorElement.contains(listItem)
    ) {
      return;
    }

    const listItemBounds = listItem.getBoundingClientRect();
    if (event.clientX > listItemBounds.left + 28) {
      return;
    }

    event.preventDefault();
    listItem.setAttribute(
      CHECKED_ATTRIBUTE,
      listItem.getAttribute(CHECKED_ATTRIBUTE) === "true" ? "false" : "true",
    );
    emitChange();
    syncActiveFormatting();
  };

  const handleInput = () => {
    pendingInlineFormattingRef.current = null;
    emitChange();
    syncActiveFormatting();
  };

  const handleBlur = () => {
    pendingInlineFormattingRef.current = null;
    setActiveFormatting({
      bold: false,
      underline: false,
      unorderedList: false,
      orderedList: false,
      checklist: false,
    });
  };

  const handleFocus = () => {
    syncActiveFormatting();
  };

  return (
    <div className="note-rich-text-editor grid gap-2">
      <span id={labelId} className="sr-only">
        {ariaLabel}
      </span>
      <div className="note-rich-text-toolbar flex flex-wrap gap-2">
        <AppButton
          aria-label="Fett formatieren"
          className={cn(
            "shrink-0 note-rich-text-toolbar-button",
            activeFormatting.bold && "is-active",
          )}
          size="icon"
          type="button"
          variant="ghost"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyCommand("bold")}
        >
          <Bold aria-hidden="true" size={16} strokeWidth={2.2} />
        </AppButton>
        <AppButton
          aria-label="Unterstreichen formatieren"
          className={cn(
            "shrink-0 note-rich-text-toolbar-button",
            activeFormatting.underline && "is-active",
          )}
          size="icon"
          type="button"
          variant="ghost"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyCommand("underline")}
        >
          <Underline aria-hidden="true" size={16} strokeWidth={2.2} />
        </AppButton>
        <AppButton
          aria-label="Stichpunkte formatieren"
          className={cn(
            "shrink-0 note-rich-text-toolbar-button",
            activeFormatting.unorderedList && "is-active",
          )}
          size="icon"
          type="button"
          variant="ghost"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyCommand("insertUnorderedList")}
        >
          <List aria-hidden="true" size={16} strokeWidth={2.2} />
        </AppButton>
        <AppButton
          aria-label="Checkbox-Liste formatieren"
          className={cn(
            "shrink-0 note-rich-text-toolbar-button",
            activeFormatting.checklist && "is-active",
          )}
          size="icon"
          type="button"
          variant="ghost"
          onMouseDown={handleToolbarMouseDown}
          onClick={applyChecklist}
        >
          <ListChecks aria-hidden="true" size={16} strokeWidth={2.2} />
        </AppButton>
        <AppButton
          aria-label="Nummerierung formatieren"
          className={cn(
            "shrink-0 note-rich-text-toolbar-button",
            activeFormatting.orderedList && "is-active",
          )}
          size="icon"
          type="button"
          variant="ghost"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyCommand("insertOrderedList")}
        >
          <ListOrdered aria-hidden="true" size={16} strokeWidth={2.2} />
        </AppButton>
      </div>
      <div
        ref={editorRef}
        aria-describedby={describedBy}
        aria-invalid={invalid ? "true" : undefined}
        aria-labelledby={labelId}
        aria-multiline="true"
        className="note-rich-text-surface"
        contentEditable
        data-empty="true"
        data-placeholder={placeholder ?? ""}
        role="textbox"
        suppressContentEditableWarning
        onClick={handleChecklistClick}
        onFocus={handleFocus}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onKeyUp={syncActiveFormatting}
        onMouseUp={syncActiveFormatting}
        onPaste={handlePaste}
      />
    </div>
  );
}
