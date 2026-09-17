<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\GraphQL\Context;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\Flow\Mvc\Controller\ControllerContext;

/** Holds the request context used to build the review's preview and frontend URIs. */
class ReviewContext
{
    /**
     * @var ControllerContext
     */
    protected $controllerContext;

    public function __construct(ControllerContext $controllerContext)
    {
        $this->controllerContext = $controllerContext;
    }

    public function getControllerContext(): ControllerContext
    {
        return $this->controllerContext;
    }
}
