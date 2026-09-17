<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\GraphQL\Resolver\Type;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use GraphQL\Error\UserError;
use Neos\ContentRepository\Domain\Model\Workspace;
use Neos\ContentRepository\Domain\Repository\WorkspaceRepository;
use Neos\Flow\Annotations as Flow;
use Neos\Neos\Domain\Service\UserService;
use NEOSidekick\WorkspaceReview\Domain\Service\ReviewService;
use NEOSidekick\WorkspaceReview\GraphQL\Context\ReviewContext;
use t3n\GraphQL\ResolverInterface;

/**
 * The single entry point of the read-only review API.
 *
 * t3n wires a resolver only when it implements ResolverInterface and matches
 * the configured resolver path pattern; without both, "Query.workspace"
 * silently resolves to null.
 *
 * @Flow\Scope("singleton")
 */
class QueryResolver implements ResolverInterface
{
    /**
     * @Flow\Inject
     * @var WorkspaceRepository
     */
    protected $workspaceRepository;

    /**
     * @Flow\Inject
     * @var UserService
     */
    protected $userService;

    /**
     * @Flow\Inject
     * @var ReviewService
     */
    protected $reviewService;

    /**
     * @param mixed $_ the root value, which this schema has none of
     * @param array<string, mixed> $variables
     * @return array<string, mixed> a Workspace as the SDL describes it
     */
    public function workspace($_, array $variables, ReviewContext $context): array
    {
        $workspace = $this->findReadableWorkspace((string)($variables['name'] ?? ''));

        return $this->reviewService->build($workspace, $context);
    }

    /**
     * Denials are thrown as client-safe user errors rather than as Flow's
     * AccessDeniedException: the latter is an ordinary throwable, which the
     * error transform would have to log, so every editor opening someone
     * else's workspace would write an exception file.
     */
    protected function findReadableWorkspace(string $name): Workspace
    {
        $workspace = $name === '' ? null : $this->workspaceRepository->findOneByName($name);
        if (
            !$workspace instanceof Workspace
            || $workspace->getBaseWorkspace() === null
            || !$this->userService->currentUserCanReadWorkspace($workspace)
        ) {
            // One message for "does not exist", "is not reviewable" and "is not
            // yours", so the API does not tell which of the three applies.
            throw new UserError(sprintf('No reviewable workspace "%s" is available.', $name));
        }

        return $workspace;
    }
}
