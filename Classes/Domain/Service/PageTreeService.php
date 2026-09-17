<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Domain\Service;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\Flow\Annotations as Flow;

/**
 * Brings the changed documents of one site and dimension into the order a
 * reviewer reads them in: pages as the page tree nests them, and the changes
 * of a page as its elements follow each other down the page.
 *
 * @Flow\Scope("singleton")
 */
class PageTreeService
{
    /**
     * Flattens the changed documents of one site and dimension into page-tree
     * order. Unchanged pages between the site and a changed page are listed
     * as ancestors, so the index reads as a tree rather than as a list of
     * paths. Each entry carries the node, its depth below the site and, for a
     * changed page, the document array; ancestors carry no document. Entries
     * followed by a deeper entry are flagged as having children.
     *
     * @param array<string, array<string, mixed>> $documents changed documents keyed by their path below the site node
     * @return array<int, array{node: NodeInterface, depth: int, document: array<string, mixed>|null, hasChildren: bool}>
     */
    public function computePageTree(array $documents): array
    {
        $entries = [];
        foreach ($documents as $documentPath => $document) {
            $segments = $documentPath === '' ? [] : explode('/', (string)$documentPath);
            $node = $document['documentNode'];
            for ($depth = count($segments) - 1; $depth >= 1; $depth--) {
                $node = $node->getParent();
                $ancestorPath = implode('/', array_slice($segments, 0, $depth));
                // A changed or already listed ancestor has had its own ancestors listed.
                if ($node === null || isset($documents[$ancestorPath]) || isset($entries[$ancestorPath])) {
                    break;
                }
                $entries[$ancestorPath] = ['node' => $node, 'depth' => $depth, 'document' => null];
            }
            $entries[$documentPath] = ['node' => $document['documentNode'], 'depth' => count($segments), 'document' => $document];
        }
        // Sort the separator below every other character so "blog/post" follows
        // "blog" directly instead of "blog-archive".
        uksort($entries, function ($a, $b): int {
            return strcmp(str_replace('/', "\0", (string)$a), str_replace('/', "\0", (string)$b));
        });
        $entries = array_values($entries);
        // Like the backend page tree, only pages with listed subpages get a chevron.
        foreach ($entries as $index => $entry) {
            $entries[$index]['hasChildren'] = isset($entries[$index + 1]) && $entries[$index + 1]['depth'] > $entry['depth'];
        }
        return $entries;
    }

    /**
     * The core lists the changes of a document in the order the repository
     * returns them, which is roughly the order they were made in. Reviewers
     * read a page top to bottom, so the changes follow the page instead:
     * sorted by the sorting indices from the document down to the node, an
     * ancestor ahead of its descendants. Keys (relative paths) are kept.
     *
     * @param array<string, array<string, mixed>> $changes
     * @return array<string, array<string, mixed>>
     */
    public function sortChangesInPageOrder(array $changes, NodeInterface $documentNode): array
    {
        $positions = [];
        foreach ($changes as $relativePath => $change) {
            $positions[$relativePath] = $this->pagePositionOf($change['node'], $documentNode);
        }
        uksort($changes, function ($a, $b) use ($positions): int {
            return $this->comparePagePositions($positions[$a], $positions[$b]) ?: strcmp((string)$a, (string)$b);
        });
        return $changes;
    }

    /**
     * Lexicographic comparison of two index lists. PHP's own array comparison
     * ranks by length first, which would put a deep element behind every
     * shallow one instead of below its own container.
     *
     * @param int[] $a
     * @param int[] $b
     */
    protected function comparePagePositions(array $a, array $b): int
    {
        $length = min(count($a), count($b));
        for ($i = 0; $i < $length; $i++) {
            if ($a[$i] !== $b[$i]) {
                return $a[$i] <=> $b[$i];
            }
        }
        return count($a) <=> count($b);
    }

    /**
     * The sorting indices of the nodes between the document and the given
     * node, top-down; comparing two such lists element by element yields the
     * order in which the nodes appear on the page.
     *
     * @return int[]
     */
    protected function pagePositionOf(NodeInterface $node, NodeInterface $documentNode): array
    {
        $indices = [];
        for ($current = $node; $current !== null && $current->getPath() !== $documentNode->getPath(); $current = $current->getParent()) {
            $indices[] = $current->getIndex();
        }
        return array_reverse($indices);
    }
}
