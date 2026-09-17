<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\GraphQL\Transform;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use GraphQL\Error\ClientAware;
use GraphQL\Error\Error;
use GraphQL\Executor\ExecutionResult;
use GraphQLTools\Transforms\Transform;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\Log\ThrowableStorageInterface;

/**
 * Decides what a failing review query tells the client and what it writes to
 * the log.
 *
 * t3n's stock transform dumps every non-GraphQL throwable into
 * Data/Logs/Exceptions and, by its package-global default, hands the message
 * to the client. Both are wrong for a denied read: an editor opening a
 * workspace they may not see would flood the log and learn why. Errors that
 * declare themselves client safe therefore pass through untouched and
 * unlogged, while everything else is logged and answered with one generic
 * sentence.
 */
class ErrorTransform implements Transform
{
    /**
     * @Flow\Inject
     * @var ThrowableStorageInterface
     */
    protected $throwableStorage;

    protected const GENERIC_MESSAGE = 'An internal error occurred while building the workspace review.';

    public function transformResult(ExecutionResult $result): ExecutionResult
    {
        $result->errors = array_map(function (Error $error): Error {
            $previousError = $error->getPrevious();
            if ($previousError === null || $previousError instanceof Error) {
                // A GraphQL error of its own (validation, a null on a non-null
                // field) already carries a message meant for the client.
                return $error;
            }
            if ($previousError instanceof ClientAware && $previousError->isClientSafe()) {
                return $error;
            }

            $this->throwableStorage->logThrowable($previousError);

            return new Error(
                self::GENERIC_MESSAGE,
                $error->getNodes(),
                $error->getSource(),
                $error->getPositions(),
                $error->getPath(),
                $previousError
            );
        }, $result->errors);

        return $result;
    }
}
