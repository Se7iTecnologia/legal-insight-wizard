export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const MM_TO_PX = 3.7795;
export const PAGE_GAP = 40;

type MarginsPx = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

interface ApplyDocumentPageBreaksOptions {
  contentHeightPerPage: number;
  marginsPx: MarginsPx;
  overflowThreshold?: number;
}

const ATOMIC_BREAK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "table",
  "blockquote",
  "pre",
  "hr",
]);

const CONTAINER_TAGS = new Set(["div", "section", "article"]);

function isBreakRelevantElement(el: HTMLElement): boolean {
  return el.classList.contains("tableWrapper") || ATOMIC_BREAK_TAGS.has(el.tagName.toLowerCase()) || CONTAINER_TAGS.has(el.tagName.toLowerCase()) || el.tagName.toLowerCase() === "ul" || el.tagName.toLowerCase() === "ol";
}

function collectBreakCandidates(node: HTMLElement, candidates: HTMLElement[]) {
  Array.from(node.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;

    const tag = child.tagName.toLowerCase();

    if (child.classList.contains("tableWrapper") || tag === "table") {
      candidates.push(child);
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const listItems = Array.from(child.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
      if (listItems.length) {
        listItems.forEach((item) => collectBreakCandidates(item, candidates));
      } else {
        candidates.push(child);
      }
      return;
    }

    if (tag === "li" || ATOMIC_BREAK_TAGS.has(tag)) {
      candidates.push(child);
      return;
    }

    const nestedRelevantChildren = Array.from(child.children).filter(
      (grandChild): grandChild is HTMLElement => grandChild instanceof HTMLElement && isBreakRelevantElement(grandChild),
    );

    if (nestedRelevantChildren.length && CONTAINER_TAGS.has(tag)) {
      collectBreakCandidates(child, candidates);
      return;
    }

    candidates.push(child);
  });
}

function getBreakCandidates(root: HTMLElement): HTMLElement[] {
  const candidates: HTMLElement[] = [];

  collectBreakCandidates(root, candidates);
  return candidates;
}

function getRelativeTop(root: HTMLElement, el: HTMLElement): number {
  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return elRect.top - rootRect.top + root.scrollTop;
}

export function applyDocumentPageBreaks(
  root: HTMLElement,
  { contentHeightPerPage, marginsPx, overflowThreshold = 0 }: ApplyDocumentPageBreaksOptions,
): number {
  root.querySelectorAll<HTMLElement>("[data-page-break='1']").forEach((el) => {
    el.style.marginTop = "";
    delete el.dataset.pageBreak;
  });

  void root.offsetHeight;

  const measures = getBreakCandidates(root).map((el) => ({
    el,
    top: getRelativeTop(root, el),
    height: el.offsetHeight,
  })).sort((a, b) => a.top - b.top);

  const pageH = contentHeightPerPage;
  const gapH = PAGE_GAP + marginsPx.top + marginsPx.bottom;

  let shift = 0;
  let nextBreak = pageH;

  for (const measure of measures) {
    if (measure.height <= 0) continue;

    const effTop = measure.top + shift;

    while (nextBreak <= effTop) {
      nextBreak += pageH + gapH;
    }

    if (measure.height >= pageH) continue;

    const effBottom = effTop + measure.height;

    if (effBottom > nextBreak && effTop < nextBreak) {
      const overflowRatio = (effBottom - nextBreak) / measure.height;

      if (overflowRatio > overflowThreshold) {
        const push = Math.ceil((nextBreak - effTop) + gapH);
        measure.el.style.marginTop = `${push}px`;
        measure.el.dataset.pageBreak = "1";
        shift += push;
        nextBreak += pageH + gapH;
      }
    }
  }

  void root.offsetHeight;
  return Math.max(1, Math.ceil((root.scrollHeight + gapH) / (pageH + gapH)));
}