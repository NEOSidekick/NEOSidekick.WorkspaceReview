import * as React from 'react';
import { NODES_FIELD_NAME, PUBLISH_FORM_ID, useIntl } from '@neosidekick/workspace-review-core';
import type { NodeChange } from '@neosidekick/workspace-review-core';

import { Checkbox } from './Checkbox';
import { useSelection } from '../useSelection';

/**
 * The checkbox of one change. The React root is a sibling of the Fluid form, so
 * the field carries the form id and the full module argument name; Fluid does
 * not prefix a field it never rendered.
 */
export function NodeCheckbox({ change }: { change: NodeChange }) {
    const translate = useIntl();
    const { selection, disabled, toggleOneChange } = useSelection();
    return (
        <Checkbox
            checked={selection.has(change.contextPath)}
            disabled={disabled}
            form={PUBLISH_FORM_ID}
            name={NODES_FIELD_NAME}
            value={change.contextPath}
            label={translate('selection.change', 'Select this change')}
            onChange={(checked) => toggleOneChange(change, checked)}
        />
    );
}
