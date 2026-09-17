<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\GraphQL\Context;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\Flow\Mvc\Controller\ControllerContext;
use t3n\GraphQL\Context;

/**
 * The review answers with URIs - the preview route of the visual compare and
 * the frontend URI of a page - and building them needs a ControllerContext.
 * The base context keeps only the main request, so this one holds on to the
 * whole controller context it is constructed with.
 */
class ReviewContext extends Context
{
    /**
     * @var ControllerContext
     */
    protected $controllerContext;

    public function __construct(ControllerContext $controllerContext)
    {
        parent::__construct($controllerContext);
        $this->controllerContext = $controllerContext;
    }

    public function getControllerContext(): ControllerContext
    {
        return $this->controllerContext;
    }
}
