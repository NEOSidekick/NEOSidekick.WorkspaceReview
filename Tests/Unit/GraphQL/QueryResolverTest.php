<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\GraphQL;

use GraphQL\Error\UserError;
use Neos\ContentRepository\Domain\Model\Workspace;
use Neos\ContentRepository\Domain\Repository\WorkspaceRepository;
use Neos\Flow\Tests\UnitTestCase;
use Neos\Neos\Domain\Service\UserService;
use NEOSidekick\WorkspaceReview\Domain\Service\ReviewService;
use NEOSidekick\WorkspaceReview\GraphQL\Context\ReviewContext;
use NEOSidekick\WorkspaceReview\GraphQL\Resolver\Type\QueryResolver;

class QueryResolverTest extends UnitTestCase
{
    /**
     * The resolver hands the review array on unchanged: graphql-php's default
     * field resolver reads it by key, so no mapping sits in between.
     *
     * @test
     */
    public function workspaceAnswersWithTheReviewOfTheNamedWorkspace(): void
    {
        $review = ['name' => 'user-admin', 'title' => 'Admin', 'sites' => []];
        $workspace = $this->createWorkspace('user-admin', true);
        $context = $this->createContext();

        $reviewService = $this->createMock(ReviewService::class);
        $reviewService->expects(self::once())->method('build')->with($workspace, $context)->willReturn($review);

        $resolver = $this->createResolver($workspace, true, $reviewService);

        self::assertSame($review, $resolver->workspace(null, ['name' => 'user-admin'], $context));
    }

    /** @test */
    public function workspaceRefusesAWorkspaceTheCurrentUserMayNotRead(): void
    {
        $resolver = $this->createResolver($this->createWorkspace('user-someone', true), false);

        $this->expectException(UserError::class);
        $resolver->workspace(null, ['name' => 'user-someone'], $this->createContext());
    }

    /**
     * Live has no base workspace, so there is nothing a review could compare
     * it against - and the user service would allow reading it.
     *
     * @test
     */
    public function workspaceRefusesTheLiveWorkspace(): void
    {
        $resolver = $this->createResolver($this->createWorkspace('live', false), true);

        $this->expectException(UserError::class);
        $resolver->workspace(null, ['name' => 'live'], $this->createContext());
    }

    /** @test */
    public function workspaceRefusesAnUnknownWorkspace(): void
    {
        $resolver = $this->createResolver(null, true);

        $this->expectException(UserError::class);
        $resolver->workspace(null, ['name' => 'does-not-exist'], $this->createContext());
    }

    private function createWorkspace(string $name, bool $hasBaseWorkspace): Workspace
    {
        $workspace = $this->createMock(Workspace::class);
        $workspace->method('getName')->willReturn($name);
        $workspace->method('getBaseWorkspace')->willReturn(
            $hasBaseWorkspace ? $this->createMock(Workspace::class) : null
        );
        return $workspace;
    }

    private function createContext(): ReviewContext
    {
        return $this->getMockBuilder(ReviewContext::class)->disableOriginalConstructor()->getMock();
    }

    private function createResolver(?Workspace $workspace, bool $canRead, ?ReviewService $reviewService = null): QueryResolver
    {
        // findOneByName is a magic finder of Flow's Repository, so the mock has
        // to be told to add it rather than to replace an existing method.
        $workspaceRepository = $this->getMockBuilder(WorkspaceRepository::class)
            ->disableOriginalConstructor()
            ->addMethods(['findOneByName'])
            ->getMock();
        $workspaceRepository->method('findOneByName')->willReturn($workspace);

        $userService = $this->createMock(UserService::class);
        $userService->method('currentUserCanReadWorkspace')->willReturn($canRead);

        return new class ($workspaceRepository, $userService, $reviewService ?? $this->createMock(ReviewService::class)) extends QueryResolver {
            public function __construct(
                WorkspaceRepository $workspaceRepository,
                UserService $userService,
                ReviewService $reviewService
            ) {
                $this->workspaceRepository = $workspaceRepository;
                $this->userService = $userService;
                $this->reviewService = $reviewService;
            }
        };
    }
}
