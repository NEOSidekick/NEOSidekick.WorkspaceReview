<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\GraphQL\Transform;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use GraphQL\Error\ClientAware;
use GraphQL\Error\Error;
use GraphQL\Executor\ExecutionResult;
use Neos\Flow\Annotations as Flow;
use Neos\Flow\Log\ThrowableStorageInterface;

/**
 * Decides what a failing review query tells the client and what it writes to
 * the log.
 *
 * Expected client-safe denials pass through without logging. Unexpected
 * failures are logged, while their technical details stay out of the response.
 *
 * The message the client reads for such an error is graphql-php's own
 * "Internal server error": an Error whose previous is not client safe is
 * serialised that way (Error::getMessage() is only used when the error is
 * client safe), so a message set here would never reach the response.
 */
class ErrorTransform
{
    /**
     * @Flow\Inject
     * @var ThrowableStorageInterface
     */
    protected $throwableStorage;

    public function transformResult(ExecutionResult $result): ExecutionResult
    {
        foreach ($result->errors as $error) {
            $previousError = $error->getPrevious();
            if ($previousError === null || $previousError instanceof Error) {
                // A GraphQL error of its own (validation, a null on a non-null
                // field) already carries a message meant for the client.
                continue;
            }
            if ($previousError instanceof ClientAware && $previousError->isClientSafe()) {
                continue;
            }

            $this->throwableStorage->logThrowable($previousError);
        }

        return $result;
    }
}
