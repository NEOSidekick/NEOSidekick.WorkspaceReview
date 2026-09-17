import * as React from 'react';
import { Button, Icon } from '@neos-project/react-ui-components';
import {
    PAGE_ATTRIBUTE,
    POST_HELPER_FORM_ID,
    appendQueryArgument,
    pageContextPath,
    useIntl,
    useReviewActions,
    useReviewData,
    useReviewState,
} from '@neosidekick/workspace-review-core';
import type { ChangedPage } from '@neosidekick/workspace-review-core';
import { PageCheckbox } from '@neosidekick/workspace-review-publishing';
import { VisualCompare } from '@neosidekick/workspace-review-visual-compare';

import styles from './PageSection.module.css';
import { Breadcrumb } from './Breadcrumb';
import { ChangeCard } from './ChangeCard';

interface PageSectionProps {
    page: ChangedPage;
    pageIndex: number;
}

/** One changed page: its heading, its actions and its changes in page order. */
export function PageSection({ page, pageIndex }: PageSectionProps) {
    const translate = useIntl();
    const actions = useReviewActions();
    const { uris, features } = useReviewData();
    const { collapsed, viewMode } = useReviewState();
    const isCollapsed = collapsed[page.id] === true;
    const contextPath = pageContextPath(page);
    const markers = { [PAGE_ATTRIBUTE]: pageIndex };

    return (
        <section className={styles.page} id={`page-${page.id}`}>
            <div {...markers} className={styles.header} tabIndex={-1}>
                <PageCheckbox page={page} />
                <div className={styles.text}>
                    <div className={styles.title}>{page.node.label}</div>
                    <div className={styles.path}>
                        <Breadcrumb nodes={page.breadcrumb} />
                        {page.node.dimensionLabel && (
                            <span className={styles.dimensionLabel}>{page.node.dimensionLabel}</span>
                        )}
                    </div>
                </div>
                <div className={styles.actions}>
                    {!page.isRemoved && page.openUri && (
                        <a
                            className={styles.iconLink}
                            href={page.openUri}
                            target="neosPreview"
                            title={translate('actions.openPage', 'Open the page in this workspace')}
                        >
                            <Icon
                                icon="external-link-alt"
                                label={translate('actions.openPage', 'Open the page in this workspace')}
                            />
                        </a>
                    )}
                    {!page.isRemoved && contextPath && (
                        <Button
                            type="submit"
                            style="lighter"
                            form={POST_HELPER_FORM_ID}
                            formAction={appendQueryArgument(uris.rebase, 'moduleArguments[targetNode]', contextPath)}
                            title={translate('actions.editPage', 'Edit the page')}
                        >
                            <Icon icon="pencil-alt" label={translate('actions.editPage', 'Edit the page')} />
                        </Button>
                    )}
                </div>
                <button
                    type="button"
                    className={styles.fold}
                    aria-expanded={!isCollapsed}
                    aria-controls={`changes-${page.id}`}
                    title={
                        isCollapsed
                            ? translate('review.expand', 'Show the changes of this page')
                            : translate('review.collapse', 'Hide the changes of this page')
                    }
                    onClick={() => actions.setCollapsed(page.id, !isCollapsed)}
                >
                    <Icon icon={isCollapsed ? 'chevron-down' : 'chevron-up'} />
                </button>
            </div>

            {/* The cards stay mounted while the page is collapsed or the visual
                compare is shown: their checkboxes are the fields of the batch
                form, so unmounting them would drop the selection from the post. */}
            <div className={styles.cards} id={`changes-${page.id}`} hidden={isCollapsed || viewMode !== 'list'}>
                {page.changes.map((change, changeIndex) => (
                    <ChangeCard key={change.id} change={change} changeIndex={changeIndex} pageIndex={pageIndex} />
                ))}
            </div>

            {features.visualCompare && (
                <VisualCompare page={page} hidden={isCollapsed || viewMode !== 'visual'} />
            )}
        </section>
    );
}
