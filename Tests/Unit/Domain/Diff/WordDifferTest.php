<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Tests\Unit\Domain\Diff;

use Neos\Flow\Tests\UnitTestCase;
use NEOSidekick\WorkspaceReview\Domain\Diff\WordDiffer;
use NEOSidekick\WorkspaceReview\Domain\Service\PropertyLabelService;

class WordDifferTest extends UnitTestCase
{
    /** @test */
    public function twoTextuallyIdenticalValuesProduceNoDiff(): void
    {
        self::assertNull($this->createDiffer()->renderDiff('<p>Hallo Welt</p>', '<p>Hallo <em>Welt</em></p>'));
    }

    /**
     * Words are escaped before they enter the markup, so the diff can be put
     * into the page with dangerouslySetInnerHTML.
     *
     * @test
     */
    public function everyWordIsEscapedBeforeItEntersTheMarkup(): void
    {
        $diff = $this->createDiffer()->renderDiff('<p>Alt</p>', '<p><script>alert(1)</script></p>');

        self::assertStringNotContainsString('<script', (string)$diff);
        self::assertStringContainsString('alert(1)', (string)$diff);
    }

    /**
     * An entity is decoded before the comparison, so a title reads "&" rather
     * than diffing "&amp;" against "&".
     *
     * @test
     */
    public function entitiesAreDecodedBeforeComparing(): void
    {
        self::assertNull($this->createDiffer()->renderDiff('Kontakt &amp; Anfahrt', 'Kontakt & Anfahrt'));
    }

    /**
     * A block-level element ends a word, an inline one does not: bolding
     * "Uhr" in front of a comma must not turn "Uhr," into "Uhr ,".
     *
     * @test
     */
    public function onlyBlockLevelElementsSeparateWords(): void
    {
        $differ = $this->createDiffer();

        self::assertSame(['18', 'Uhr,'], $differ->tokenize('<strong>18 Uhr</strong>,'));
        self::assertSame(['Erste', 'Zweite'], $differ->tokenize('<p>Erste</p><p>Zweite</p>'));
    }

    /**
     * A long unchanged run between two edits collapses, so a one-word change
     * in a long text does not reprint the whole paragraph - unless the caller
     * asks for the full wording, which the visual compare does.
     *
     * @test
     */
    public function longUnchangedRunsCollapseOnlyWhenCollapsingIsAllowed(): void
    {
        $words = implode(' ', array_map(static fn(int $index): string => 'Wort' . $index, range(1, 40)));
        $differ = $this->createDiffer();

        self::assertStringContainsString(WordDiffer::ELLIPSIS_CLASS, (string)$differ->renderDiff('Alt ' . $words, 'Neu ' . $words));
        self::assertStringNotContainsString(
            WordDiffer::ELLIPSIS_CLASS,
            (string)$differ->renderDiff('Alt ' . $words, 'Neu ' . $words, false)
        );
    }

    /**
     * The translator stand-in answers with the label id, so the hidden screen
     * reader labels are recognizable in the assertions.
     */
    private function createDiffer(): WordDiffer
    {
        $propertyLabelService = new class extends PropertyLabelService {
            public function translate(string $id, array $arguments = [], ?int $quantity = null): string
            {
                return $id;
            }
        };

        return new class ($propertyLabelService) extends WordDiffer {
            public function __construct(PropertyLabelService $propertyLabelService)
            {
                $this->propertyLabelService = $propertyLabelService;
            }
        };
    }
}
