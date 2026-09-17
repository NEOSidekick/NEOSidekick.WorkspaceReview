import * as React from 'react';

/**
 * The icon of a node type. It arrives as the Font Awesome class notation the
 * NodeTypes configuration uses and is rendered with the icon font the backend
 * page already loads, so the SVG icon packs stay out of the module's bundle.
 * It says nothing the label next to it does not, hence it is hidden from
 * screen readers.
 */
export function NodeTypeIcon({ icon }: { icon: string }) {
    return <i className={icon || 'fas fa-file'} aria-hidden="true" />;
}
