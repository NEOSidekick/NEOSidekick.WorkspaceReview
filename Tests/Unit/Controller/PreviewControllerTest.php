<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\Controller;

use Neos\ContentRepository\Domain\Model\NodeInterface;
use Neos\ContentRepository\Domain\Model\Workspace;
use Neos\ContentRepository\Domain\Service\Context;
use Neos\Flow\Mvc\ActionResponse;
use Neos\Flow\Security\Exception\AccessDeniedException;
use Neos\Flow\Tests\UnitTestCase;
use Neos\Neos\Domain\Service\UserService;
use Neos\Neos\View\FusionView;
use NEOSidekick\WorkspaceReview\Controller\PreviewController;

class PreviewControllerTest extends UnitTestCase
{
    public static function workspaceAccessCases(): array
    {
        return [
            'public base workspace' => [true, false, false, true],
            'readable workspace' => [false, true, false, true],
            'another owners private workspace with management permission' => [false, false, true, true],
            'another owners workspace without permission' => [false, false, false, false],
        ];
    }

    /**
     * @test
     * @dataProvider workspaceAccessCases
     */
    public function previewRequiresReadOrManagementPermission(
        bool $isPublic,
        bool $canRead,
        bool $canManage,
        bool $allowed
    ): void {
        $workspace = $this->createMock(Workspace::class);
        $workspace->method('getName')->willReturn('private-review');
        $workspace->method('isPublicWorkspace')->willReturn($isPublic);
        $context = $this->createMock(Context::class);
        $context->method('getWorkspace')->willReturn($workspace);
        $node = $this->createMock(NodeInterface::class);
        $node->method('getContext')->willReturn($context);
        $userService = $this->createMock(UserService::class);
        $userService->method('currentUserCanReadWorkspace')->willReturn($canRead);
        $userService->method('currentUserCanManageWorkspace')->willReturn($canManage);
        $view = $this->createMock(FusionView::class);
        $response = new ActionResponse();
        $view->expects($allowed ? self::once() : self::never())
            ->method('setOption')->with('enableContentCache', false);
        $view->expects($allowed ? self::once() : self::never())
            ->method('assign')->with('value', $node);

        $controller = new PreviewController();
        $this->inject($controller, 'userService', $userService);
        $this->inject($controller, 'view', $view);
        $this->inject($controller, 'response', $response);

        if (!$allowed) {
            $this->expectException(AccessDeniedException::class);
        }
        $controller->showAction($node);
        self::assertSame('no-store', $response->getHttpHeader('Cache-Control'));
    }
}
