/** Required elements fail with a useful message when markup and views disagree. */
export function $<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing workspace element: ${selector}`);
  return element;
}

export const $$ = <T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] => [...root.querySelectorAll<T>(selector)];

export function field(
  selector: string,
): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const element = $(selector);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  )
    return element;
  throw new Error(`Expected a form field: ${selector}`);
}

export const dialog = (selector: string) => $<HTMLDialogElement>(selector);
