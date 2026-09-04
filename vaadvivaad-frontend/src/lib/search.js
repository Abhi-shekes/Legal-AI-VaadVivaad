/**
 * Opening the search palette from anywhere.
 *
 * A custom event rather than shared state: the rail button and the ⌘K
 * shortcut both need to open the panel, and routing that through context or
 * a store would make every authenticated page re-render for a thing that is
 * open perhaps twice a session.
 *
 * Kept out of the component file so it stays a component-only module and
 * Fast Refresh keeps working.
 */

export const OPEN_SEARCH_EVENT = "vv:open-search"

export function openSearch() {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))
}
