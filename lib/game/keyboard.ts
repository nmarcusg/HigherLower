/**
 * Shared keyboard shortcut guard for solo and multiplayer comparison gameplay.
 *
 * Intentionally allows ArrowUp/ArrowDown when focus rests on standard buttons
 * or links (including Higher/Lower buttons themselves) so keyboard players can
 * mix mouse/Tab navigation and arrow-key answering seamlessly, while blocking
 * shortcuts inside text inputs, dropdowns, custom arrow-navigated widgets, and
 * open modal dialogs.
 */
export function shouldIgnoreGameplayShortcut(event: KeyboardEvent): boolean {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }

  if (document.querySelector('[role="dialog"], dialog[open], [aria-modal="true"]')) {
    return true;
  }

  const target = event.target;
  if (!(target instanceof Element)) return false;

  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    return Boolean(
      target.closest(
        'input, textarea, select, [contenteditable], [contenteditable="true"], [role="textbox"], [role="combobox"], [data-audio-control], .audio-surface-popover, [role="menu"], [role="menuitem"], [role="listbox"], [role="option"], [role="slider"], [role="radiogroup"], [role="radio"], [role="switch"]',
      ),
    );
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable], [contenteditable="true"], [role="textbox"], [role="combobox"], .audio-surface-popover',
    ),
  );
}
