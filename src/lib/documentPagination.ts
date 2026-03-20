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

function getBreakCandidates(root: HTMLElement): HTMLElement[] {
  const candidates: HTMLElement[] = [];

  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;

    const tag = child.tagName.toLowerCase();

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(child.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
      candidates.push(...(items.length ? items : [child]));
      return;
    }

    if (child.classList.contains("tableWrapper")) {
      candidates.push(child);
      return;
    }

    candidates.push(child);
  });

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
  }));

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