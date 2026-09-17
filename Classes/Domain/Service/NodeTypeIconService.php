<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Domain\Service;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\Flow\Annotations as Flow;

/**
 * Turns a node type's "ui.icon" setting into Font Awesome classes the client
 * can render, the way the backend UI does: "globe" and the legacy
 * "icon-globe" become "fas fa-globe", "fa-globe" gets the "fas" style, and a
 * value that already names its style ("far fa-file") is kept.
 *
 * @Flow\Scope("singleton")
 */
class NodeTypeIconService
{
    protected const FALLBACK = 'fas fa-file';

    public function normalize(?string $icon): string
    {
        $icon = trim((string)$icon);
        if ($icon === '') {
            return self::FALLBACK;
        }
        if (strpos($icon, ' ') !== false) {
            return $icon;
        }
        if (strpos($icon, 'icon-') === 0) {
            $icon = substr($icon, 5);
        }
        if (strpos($icon, 'fa-') !== 0) {
            $icon = 'fa-' . $icon;
        }
        return 'fas ' . $icon;
    }

    /**
     * NodeType has no "ui" accessor, so the icon has to be read from the full
     * configuration rather than from a getter.
     */
    public function forNode(NodeInterface $node): string
    {
        $configuration = $node->getNodeType()->getFullConfiguration();
        $icon = $configuration['ui']['icon'] ?? null;
        return $this->normalize(is_string($icon) ? $icon : null);
    }
}
