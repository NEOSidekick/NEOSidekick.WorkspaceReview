import * as React from 'react';
import { useLayoutEffect, useRef } from 'react';

import styles from './BackendBreadcrumb.module.css';

/**
 * The breadcrumb of the backend module layout spans the whole width above the
 * module and takes a row of its own. The review moves that element, as the
 * layout rendered it, into the sidebar column and puts it back when it unmounts.
 */
export function BackendBreadcrumb() {
    const slotRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const slot = slotRef.current;
        const breadcrumb = document.querySelector('.neos-breadcrumb');
        if (!slot || !breadcrumb || !breadcrumb.parentNode) return;
        const parent = breadcrumb.parentNode;
        const nextSibling = breadcrumb.nextSibling;
        slot.appendChild(breadcrumb);
        return () => {
            parent.insertBefore(breadcrumb, nextSibling);
        };
    }, []);

    return <div ref={slotRef} className={styles.breadcrumb} />;
}
