import * as React from 'react';
import { useState } from 'react';
import { Button, Icon } from '@neos-project/react-ui-components';
import { Dialog, useIntl } from '@neosidekick/workspace-review-core';

/** Explains the recursive scope inherited from Neos without changing its actions. */
export function ActionScopeInfo() {
    const translate = useIntl();
    const [isOpen, setIsOpen] = useState(false);
    const title = translate('actions.scopeHelp', 'What will be published or discarded?');

    return (
        <>
            <Button type="button" style="lighter" title={title} aria-label={title} onClick={() => setIsOpen(true)}>
                <Icon icon="info-circle" />
            </Button>
            <Dialog
                isOpen={isOpen}
                type="success"
                style="narrow"
                title={title}
                onRequestClose={() => setIsOpen(false)}
                actions={[
                    <Button key="close" style="lighter" onClick={() => setIsOpen(false)}>
                        {translate('shortcuts.close', 'Close')}
                    </Button>,
                ]}
            >
                <p>
                    {translate(
                        'actions.scopeContent',
                        'Neos publishes or discards an entire element, including all its changed properties. For pages and containers, this also includes their nested content, even when those child changes are not selected. Child pages are not included by this rule.',
                    )}
                </p>
                <p>
                    {translate(
                        'actions.scopeSelection',
                        'To act on individual content changes, select those elements instead of their page or container. Publishing can also require new or moved parent pages; their changes are added to the selection. Discarding does not add those parent pages.',
                    )}
                </p>
                <p>
                    {translate(
                        'actions.scopeDiscard',
                        'Publishing transfers the affected changes to the base workspace. Discarding removes them from this workspace and restores the base version; newly created elements are removed.',
                    )}
                </p>
            </Dialog>
        </>
    );
}
