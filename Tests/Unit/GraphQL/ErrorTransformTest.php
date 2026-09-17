<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\GraphQL;

use GraphQL\Error\Error;
use GraphQL\Error\FormattedError;
use GraphQL\Error\UserError;
use GraphQL\Executor\ExecutionResult;
use Neos\Flow\Log\ThrowableStorageInterface;
use Neos\Flow\Tests\UnitTestCase;
use NEOSidekick\WorkspaceReview\GraphQL\Transform\ErrorTransform;

class ErrorTransformTest extends UnitTestCase
{
    /**
     * Loading graphql-php prints PHP 8 deprecation notices about its
     * jsonSerialize() return types. Triggering that load here keeps the output
     * out of the tests themselves, which PHPUnit would call risky.
     */
    public static function setUpBeforeClass(): void
    {
        class_exists(Error::class);
        class_exists(UserError::class);
        class_exists(ExecutionResult::class);
        class_exists(FormattedError::class);
    }

    /**
     * A denied read is the expected answer to opening someone else's
     * workspace, not an incident: it reaches the client as it is and writes
     * no exception file.
     *
     * @test
     */
    public function aClientSafeErrorPassesThroughUnloggedAndUnchanged(): void
    {
        $throwableStorage = $this->createMock(ThrowableStorageInterface::class);
        $throwableStorage->expects(self::never())->method('logThrowable');
        $error = new Error('No reviewable workspace "live" is available.', null, null, [], null, new UserError('No reviewable workspace "live" is available.'));

        $result = $this->transform($throwableStorage, [$error]);

        self::assertSame(['No reviewable workspace "live" is available.'], $this->clientMessages($result));
    }

    /**
     * Anything else is a real failure: it is logged, and the client is told
     * that something went wrong but not what.
     *
     * @test
     */
    public function anUnexpectedThrowableIsLoggedAndAnsweredGenerically(): void
    {
        $throwableStorage = $this->createMock(ThrowableStorageInterface::class);
        $throwableStorage->expects(self::once())->method('logThrowable');
        $previous = new \RuntimeException('SQLSTATE[42S02]: Base table or view not found');
        $error = new Error($previous->getMessage(), null, null, [], null, $previous);

        $result = $this->transform($throwableStorage, [$error]);

        self::assertSame(['Internal server error'], $this->clientMessages($result));
    }

    /**
     * A validation error carries no previous throwable and is meant for the
     * client already.
     *
     * @test
     */
    public function aPlainGraphQlErrorIsLeftAlone(): void
    {
        $throwableStorage = $this->createMock(ThrowableStorageInterface::class);
        $throwableStorage->expects(self::never())->method('logThrowable');
        $error = new Error('Cannot query field "nope" on type "Query".');

        $result = $this->transform($throwableStorage, [$error]);

        self::assertSame(['Cannot query field "nope" on type "Query".'], $this->clientMessages($result));
    }

    /**
     * What the client actually receives: graphql-php formats the errors of a
     * result, and only a client-safe error keeps its own message there.
     *
     * @return string[]
     */
    private function clientMessages(ExecutionResult $result): array
    {
        return array_column($result->toArray()['errors'] ?? [], 'message');
    }

    /**
     * @param Error[] $errors
     */
    private function transform(ThrowableStorageInterface $throwableStorage, array $errors): ExecutionResult
    {
        $transform = new class ($throwableStorage) extends ErrorTransform {
            public function __construct(ThrowableStorageInterface $throwableStorage)
            {
                $this->throwableStorage = $throwableStorage;
            }
        };

        return $transform->transformResult(new ExecutionResult(null, $errors));
    }
}
