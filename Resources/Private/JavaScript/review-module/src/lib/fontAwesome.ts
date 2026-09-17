import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';

/**
 * The component library's Icon resolves names through the FontAwesome library.
 * Node type icons come from the NodeTypes configuration, so every pack has to be
 * available; the backend's own icon font is not used inside the React module.
 */
export function loadIconLibrary(): void {
    library.add(fas, far, fab);
}
