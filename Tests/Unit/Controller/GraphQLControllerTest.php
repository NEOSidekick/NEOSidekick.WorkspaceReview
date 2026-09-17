<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\Controller;

use GraphQL\Error\Error;
use GraphQL\Error\FormattedError;
use GraphQL\Executor\ExecutionResult;
use Neos\Flow\Mvc\ActionResponse;
use Neos\Flow\Mvc\Controller\ControllerContext;
use Neos\Flow\Tests\UnitTestCase;
use NEOSidekick\WorkspaceReview\Controller\GraphQLController;
use NEOSidekick\WorkspaceReview\GraphQL\Resolver\Type\QueryResolver;
use NEOSidekick\WorkspaceReview\GraphQL\Transform\ErrorTransform;

class GraphQLControllerTest extends UnitTestCase
{
    public static function setUpBeforeClass(): void
    {
        class_exists(Error::class);
        class_exists(FormattedError::class);
        class_exists(ExecutionResult::class);
        class_exists(\GraphQL\Language\SourceLocation::class);
        class_exists(\GraphQL\Language\AST\NodeList::class);
        class_exists(\GraphQL\Type\Definition\Type::class);
    }

    /** @test */
    public function theRealSchemaResolvesWorkspaceVariablesAndNestedArrayFields(): void
    {
        $resolver = $this->createMock(QueryResolver::class);
        $resolver->expects(self::once())->method('workspace')
            ->with(null, ['name' => 'user-editor'])
            ->willReturn(['name' => 'user-editor', 'sites' => [['name' => 'Example', 'dimensions' => []]]]);
        $controller = $this->createController($resolver);
        $errorReporting = error_reporting();
        ob_start();
        $result = json_decode($controller->queryAction(
            'query Review($name: String!) { workspace(name: $name) { name sites { name dimensions { hash } } } }',
            ['name' => 'user-editor'],
            'Review'
        ), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('', ob_get_clean(), 'The first query must not emit output before its JSON response.');
        self::assertSame($errorReporting, error_reporting());
        self::assertSame(['data' => ['workspace' => [
            'name' => 'user-editor', 'sites' => [['name' => 'Example', 'dimensions' => []]],
        ]]], $result);
    }

    /** @test */
    public function mutationsAreRejectedWithoutCallingTheResolver(): void
    {
        $resolver = $this->createMock(QueryResolver::class);
        $resolver->expects(self::never())->method('workspace');
        $result = json_decode($this->createController($resolver)->queryAction(
            'mutation { workspace(name: "user-editor") { name } }'
        ), true, 512, JSON_THROW_ON_ERROR);
        self::assertNotEmpty($result['errors']);
    }

    private function createController(QueryResolver $resolver): GraphQLController
    {
        return new class ($resolver, $this->createMock(ControllerContext::class)) extends GraphQLController {
            public function __construct(QueryResolver $resolver, ControllerContext $context)
            {
                $this->queryResolver = $resolver;
                $this->errorTransform = new ErrorTransform();
                $this->controllerContext = $context;
                $this->response = new ActionResponse();
                $this->schemaSource = __DIR__ . '/../../../Resources/Private/GraphQL/schema.root.graphql';
            }
        };
    }
}
