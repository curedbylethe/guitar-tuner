export function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing interface element: ${selector}`);
  return node;
}
export function text(id: string, value: string): void {
  const node = element('#' + id); if (node.textContent !== value) node.textContent = value;
}
export function showError(message: string): void { text('err',message); element('#err').hidden = !message; }
