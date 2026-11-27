<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Domain\Service;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\Flow\Annotations as Flow;

/**
 * Hands the results of publishing and discarding in popup mode to the review
 * page the action redirects to - and to that page view only.
 *
 * Every write of the review is a form post followed by a redirect, so the page
 * that can tell the window that opened the popup what happened is the next
 * one. Keeping the results in the session instead of the redirect URI means a
 * reload or a step back through the history finds nothing to report twice.
 *
 * @Flow\Scope("session")
 */
class PopupResultStore
{
    /**
     * @var array<int, array<string, mixed>>
     */
    protected $results = [];

    /**
     * @param array<string, mixed> $result
     * @Flow\Session(autoStart=true)
     */
    public function add(array $result): void
    {
        $this->results[] = $result;
    }

    /**
     * Returns every stored result and forgets them.
     *
     * @return array<int, array<string, mixed>>
     */
    public function takeAll(): array
    {
        $results = $this->results;
        $this->results = [];
        return $results;
    }
}
