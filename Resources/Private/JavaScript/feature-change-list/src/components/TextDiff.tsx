import * as React from 'react';

import styles from './ChangeCard.module.css';

/**
 * The collapsed word diff of a text property. The server escapes every word and
 * emits only `<ins>`, `<del>` and its two documented global classes, so the HTML
 * can be inserted as it is.
 */
export function TextDiff({ html }: { html: string }) {
    return <div className={styles.text} dangerouslySetInnerHTML={{ __html: html }} />;
}
