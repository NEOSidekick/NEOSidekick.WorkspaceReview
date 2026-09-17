<?php

declare(strict_types=1);

namespace NEOSidekick\WorkspaceReview\Domain\Diff;

/*
 * This file is part of the NEOSidekick.WorkspaceReview package.
 */

use Neos\Diff\SequenceMatcher;
use Neos\Flow\Annotations as Flow;
use NEOSidekick\WorkspaceReview\Domain\Service\PropertyLabelService;

/**
 * Word-level inline diff of two text values as safe HTML.
 *
 * Reviewers read the words that changed, not two complete paragraphs, so the
 * comparison works on words rather than lines and the unchanged runs between
 * two edits collapse once they grow long. The thresholds are constants, not
 * settings: they shape server-rendered HTML the client cannot re-render.
 *
 * @Flow\Scope("singleton")
 */
class WordDiffer
{
    /**
     * When rendering unchanged words between two edits, runs longer than this
     * are collapsed to their first and last words plus an ellipsis.
     */
    public const CONTEXT_COLLAPSE_THRESHOLD = 24;
    public const CONTEXT_WORDS_KEPT = 10;

    /**
     * Inserted/deleted runs longer than this are shortened in the middle.
     */
    public const EDITED_RUN_COLLAPSE_THRESHOLD = 50;

    /**
     * The two class names the client styles as a plain stylesheet, because
     * they travel inside server-rendered HTML and must not be hashed by the
     * CSS-modules build.
     */
    public const ELLIPSIS_CLASS = 'neosidekick-review-ellipsis';
    public const SCREEN_READER_CLASS = 'neosidekick-review-sr-only';

    /**
     * @Flow\Inject
     * @var PropertyLabelService
     */
    protected $propertyLabelService;

    /**
     * Word-level inline diff as safe HTML with <ins>/<del> markers. Long
     * unchanged and long edited runs are collapsed with an ellipsis unless
     * $collapse is false. Returns null when both sides are textually
     * identical after normalization.
     */
    public function renderDiff(string $original, string $changed, bool $collapse = true): ?string
    {
        $originalWords = $this->tokenize($original);
        $changedWords = $this->tokenize($changed);
        if ($originalWords === $changedWords) {
            return null;
        }

        $matcher = new SequenceMatcher($originalWords, $changedWords);
        $html = [];
        foreach ($matcher->getOpCodes() as [$tag, $i1, $i2, $j1, $j2]) {
            switch ($tag) {
                case 'equal':
                    $words = array_slice($originalWords, $i1, $i2 - $i1);
                    $html[] = $this->renderContextWords($words, $i1 === 0, $i2 === count($originalWords), $collapse);
                    break;
                case 'delete':
                    $html[] = $this->renderEditedRun('del', array_slice($originalWords, $i1, $i2 - $i1), $collapse);
                    break;
                case 'insert':
                    $html[] = $this->renderEditedRun('ins', array_slice($changedWords, $j1, $j2 - $j1), $collapse);
                    break;
                case 'replace':
                    $html[] = $this->renderEditedRun('del', array_slice($originalWords, $i1, $i2 - $i1), $collapse);
                    $html[] = $this->renderEditedRun('ins', array_slice($changedWords, $j1, $j2 - $j1), $collapse);
                    break;
            }
        }
        return implode(' ', array_filter($html, static fn($fragment) => $fragment !== ''));
    }

    /**
     * Normalizes a rich-text or plain value into a list of comparable words:
     * markup is stripped and entities are decoded, so "&amp;" diffs as "&".
     *
     * Only a block-level element ends a word and is therefore replaced by a
     * space. An inline element may sit inside a word or between a word and its
     * punctuation, so it is dropped without leaving a space behind - bolding
     * "18 Uhr" in front of a comma must not turn "Uhr," into "Uhr ,".
     *
     * @return string[]
     */
    public function tokenize(string $value): array
    {
        $blockLevelTagNames = implode('|', RichTextDiffer::BLOCK_LEVEL_TAG_NAMES);
        // The lookahead keeps the tag name whole, so "<pre>" is not read as a
        // "<p>" and "<header>" not as an "<hr>".
        $text = preg_replace('#</?(?:' . $blockLevelTagNames . ')(?=[\s/>])[^>]*>#i', ' ', $value);
        $text = preg_replace('/<[^>]*>/', '', (string)$text);
        $text = html_entity_decode((string)$text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/[\x{00A0}\s]+/u', ' ', $text);
        $text = trim((string)$text);
        return $text === '' ? [] : explode(' ', $text);
    }

    /**
     * Renders an unchanged word run, keeping only the words adjacent to the
     * surrounding edits when the run is long. Runs at the very start or end
     * of the text only need context on their edit-facing side.
     *
     * @param string[] $words
     */
    protected function renderContextWords(array $words, bool $isStart, bool $isEnd, bool $collapse = true): string
    {
        $ellipsis = '<span class="' . self::ELLIPSIS_CLASS . '">…</span>';
        if (!$collapse || count($words) <= self::CONTEXT_COLLAPSE_THRESHOLD) {
            return $this->escapeWords($words);
        }
        if ($isStart && $isEnd) {
            return $this->escapeWords($words);
        }
        if ($isStart) {
            return $ellipsis . ' ' . $this->escapeWords(array_slice($words, -self::CONTEXT_WORDS_KEPT));
        }
        if ($isEnd) {
            return $this->escapeWords(array_slice($words, 0, self::CONTEXT_WORDS_KEPT)) . ' ' . $ellipsis;
        }
        return $this->escapeWords(array_slice($words, 0, self::CONTEXT_WORDS_KEPT))
            . ' ' . $ellipsis . ' '
            . $this->escapeWords(array_slice($words, -self::CONTEXT_WORDS_KEPT));
    }

    /**
     * @param string[] $words
     */
    protected function escapeWords(array $words): string
    {
        return htmlspecialchars(implode(' ', $words), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Wraps an edited word run in its <ins> or <del> marker. Screen readers
     * do not reliably announce these elements, so the run starts with a
     * visually hidden "added:" or "deleted:" label; sighted reviewers get
     * the same information from the underline and strike-through the
     * stylesheet adds, which do not depend on colour.
     *
     * @param string $tagName either "ins" or "del"
     * @param string[] $words
     */
    protected function renderEditedRun(string $tagName, array $words, bool $collapse = true): string
    {
        $label = $this->translate($tagName === 'del' ? 'diff.deleted' : 'diff.added');
        return '<' . $tagName . '>'
            . '<span class="' . self::SCREEN_READER_CLASS . '">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . ' </span>'
            . $this->renderEditedWords($words, $collapse)
            . '</' . $tagName . '>';
    }

    /**
     * Renders an inserted or deleted word run. Very long runs (e.g. the full
     * text of a newly created element) are shortened in the middle, so a
     * single change cannot dominate the whole review page.
     *
     * @param string[] $words
     */
    protected function renderEditedWords(array $words, bool $collapse = true): string
    {
        $limit = self::EDITED_RUN_COLLAPSE_THRESHOLD;
        if (!$collapse || count($words) <= $limit) {
            return $this->escapeWords($words);
        }
        $kept = (int)floor($limit / 2);
        return $this->escapeWords(array_slice($words, 0, $kept))
            . ' <span class="' . self::ELLIPSIS_CLASS . '">…</span> '
            . $this->escapeWords(array_slice($words, -$kept));
    }

    protected function translate(string $id): string
    {
        return $this->propertyLabelService->translate($id);
    }
}
