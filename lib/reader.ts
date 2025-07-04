import { storage } from '@/lib/mmkv';
import { Metadata } from '@/modules/CalicoParser';
import { getChunks, parseChunk } from '@/lib/epub';

export interface Page {
    content: string;
    chapterIndex: number;
    pageIndex: number;
    totalPagesInChapter: number;
}

export interface ReaderState {
    content: string;
    loading: boolean;
    currChunk: number;
    currChapter: number;
    currPage: number;
    error: string | null;
    metadata: Metadata | null;
    chunkCache: Map<number, Map<string, string>>;
    pageCache: Map<string, Page[]>;
}

export interface ChapterPosition {
    chunk: number;
    chapter: number;
    page: number;
}

export interface PaginationConfig {
    wordsPerPage: number;
    preserveParagraphs: boolean;
    fontSize: number;
    lineHeight: number;
}

export class ReaderManager {
    private bookKey: string;
    private state: ReaderState;
    private setState: (updater: (prev: ReaderState) => ReaderState) => void;
    private paginationConfig: PaginationConfig;
    private screenDimensions: { width: number; height: number };

    constructor(
        bookKey: string,
        state: ReaderState,
        setState: (updater: (prev: ReaderState) => ReaderState) => void,
        screenDimensions: { width: number; height: number },
        paginationConfig?: Partial<PaginationConfig>,
    ) {
        this.bookKey = bookKey;
        this.state = state;
        this.setState = setState;
        this.screenDimensions = screenDimensions;

        const baseConfig = {
            wordsPerPage: 250,
            preserveParagraphs: true,
            fontSize: 16,
            lineHeight: 24,
            ...paginationConfig,
        };

        this.paginationConfig = baseConfig;
        this.paginationConfig.wordsPerPage = this.calculateWordsPerPage();
    }

    private calculateWordsPerPage(): number {
        const { fontSize, lineHeight } = this.paginationConfig;
        const { width: screenWidth, height: screenHeight } = this.screenDimensions;

        const usableWidth = screenWidth;
        const usableHeight = screenHeight;

        const charWidth = fontSize * 0.6;
        const charPerLine = Math.floor(usableWidth / charWidth);
        const linesPerPage = Math.floor(usableHeight / lineHeight);
        const charactersPerPage = charPerLine * linesPerPage;
        const wordsPerPage = Math.floor(charactersPerPage / 6);

        console.log('Calculated words per page:', wordsPerPage);
        return Math.max(150, Math.min(400, wordsPerPage));
    }

    private paginateText(htmlContent: string, chapterIndex: number): Page[] {
        const cleanText = this.extractTextFromHtml(htmlContent);
        const words = cleanText.split(/\s+/).filter(word => word.length > 0);
        const totalWords = words.length;
        const wordsPerPage = Math.floor(this.paginationConfig.wordsPerPage);

        if (totalWords <= wordsPerPage) {
            return [
                {
                    content: htmlContent,
                    chapterIndex,
                    pageIndex: 0,
                    totalPagesInChapter: 1,
                },
            ];
        }

        const paragraphs = this.splitIntoParagraphs(htmlContent);
        const pages: Page[] = [];
        let currentPageParagraphs: string[] = [];
        let currentWordCount = 0;

        for (const paragraph of paragraphs) {
            const paragraphWords = this.extractTextFromHtml(paragraph)
                .split(/\s+/)
                .filter(w => w.length > 0);
            const paragraphWordCount = paragraphWords.length;

            if (currentWordCount + paragraphWordCount > wordsPerPage && currentPageParagraphs.length > 0) {
                pages.push({
                    content: currentPageParagraphs.join(''),
                    chapterIndex,
                    pageIndex: pages.length,
                    totalPagesInChapter: 0,
                });
                currentPageParagraphs = [];
                currentWordCount = 0;
            }

            currentPageParagraphs.push(paragraph);
            currentWordCount += paragraphWordCount;
        }

        if (currentPageParagraphs.length > 0) {
            pages.push({
                content: currentPageParagraphs.join(''),
                chapterIndex,
                pageIndex: pages.length,
                totalPagesInChapter: 0,
            });
        }

        return pages.map(page => ({
            ...page,
            totalPagesInChapter: pages.length,
        }));
    }

    private splitIntoParagraphs(htmlContent: string): string[] {
        const blockElements = [
            '</p>',
            '</div>',
            '</h1>',
            '</h2>',
            '</h3>',
            '</h4>',
            '</h5>',
            '</h6>',
            '</blockquote>',
            '</li>',
        ];
        let content = htmlContent;

        blockElements.forEach(tag => {
            content = content.replace(new RegExp(tag, 'gi'), tag + '|||SPLIT|||');
        });

        return content
            .split('|||SPLIT|||')
            .map(p => p.trim())
            .filter(p => p.length > 0);
    }

    private createPage(content: string, chapterIndex: number, pageIndex: number): Page {
        return {
            content,
            chapterIndex,
            pageIndex,
            totalPagesInChapter: 0, // UPDATE LATER
        };
    }

    private extractTextFromHtml(html: string): string {
        return html
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    async loadDocument(): Promise<void> {
        try {
            this.setLoading(true);

            const raw = storage.getString('books:' + this.bookKey);
            if (!raw) {
                console.error('book doesnt exist');
                return;
            }

            let metadata: Metadata = JSON.parse(raw);

            if (!metadata.chunks || Object.keys(metadata.chunks).length === 0) {
                const chunks = await getChunks(metadata.path);
                metadata = {
                    ...metadata,
                    chunks: chunks,
                };
                storage.set('books:' + this.bookKey, JSON.stringify(metadata));
            }

            this.setState(prev => ({ ...prev, metadata }));
            await this.loadChunkContent(0, metadata);
        } catch (error) {
            console.error('Failed to load EPUB:', error);
            this.setError('Failed to load EPUB');
        } finally {
            this.setLoading(false);
        }
    }

    async loadChunkContent(chunkIndex: number, meta?: Metadata): Promise<void> {
        this.setLoading(true);

        const bookMetadata = meta || this.state.metadata;
        if (!bookMetadata?.chunks) return;

        const chunkKeys = Object.keys(bookMetadata.chunks);
        if (chunkIndex >= chunkKeys.length) return;

        if (this.state.chunkCache.has(chunkIndex)) {
            const cachedChunk = this.state.chunkCache.get(chunkIndex)!;
            const chunkKey = chunkKeys[chunkIndex];
            const firstChapterPath = bookMetadata.chunks[chunkKey][0];
            const firstChapterContent = cachedChunk.get(firstChapterPath) || '';

            let firstChapterPages = this.state.pageCache.get(firstChapterPath);
            if (!firstChapterPages) {
                firstChapterPages = this.paginateText(firstChapterContent, 0);
            }

            this.setState(prev => ({
                ...prev,
                pageCache: new Map(prev.pageCache).set(firstChapterPath, firstChapterPages!),
                content: firstChapterPages![0]?.content || firstChapterContent,
                currChapter: 0,
                currChunk: chunkIndex,
                currPage: 0,
            }));

            this.setLoading(false);
            return;
        }

        try {
            const chunkKey = chunkKeys[chunkIndex];
            const chapterPaths = bookMetadata.chunks[chunkKey];

            const chapterContents = await parseChunk(bookMetadata.path, chapterPaths);

            const chunkMap = new Map<string, string>();
            Object.entries(chapterContents).forEach(([path, content]) => {
                chunkMap.set(path, content);
            });

            const firstChapterPath = chapterPaths[0];
            const firstChapterContent = chapterContents[firstChapterPath] || '';
            const firstChapterPages = this.paginateText(firstChapterContent, 0);

            this.setState(prev => ({
                ...prev,
                chunkCache: new Map(prev.chunkCache).set(chunkIndex, chunkMap),
                pageCache: new Map(prev.pageCache).set(firstChapterPath, firstChapterPages),
                content: firstChapterPages[0]?.content || firstChapterContent,
                currChapter: 0,
                currChunk: chunkIndex,
                currPage: 0,
            }));
        } catch (error) {
            console.error('Failed to load chunk:', error);
            this.setError('Failed to load chapter');
        } finally {
            this.setLoading(false);
        }
    }

    async navigateToPage(direction: 'next' | 'prev'): Promise<void> {
        if (!this.state.metadata?.chunks) return;

        const chunkKeys = Object.keys(this.state.metadata.chunks);
        const currentChunkKey = chunkKeys[this.state.currChunk];
        const chaptersInChunk = this.state.metadata.chunks[currentChunkKey];
        const currentChapterPath = chaptersInChunk[this.state.currChapter];

        let currentPages = this.state.pageCache.get(currentChapterPath);
        if (!currentPages) {
            const chapterContent = this.state.chunkCache.get(this.state.currChunk)?.get(currentChapterPath);
            if (chapterContent) {
                currentPages = this.paginateText(chapterContent, this.state.currChapter);
                this.setState(prev => ({
                    ...prev,
                    pageCache: new Map(prev.pageCache).set(currentChapterPath, currentPages!),
                }));
            } else {
                return;
            }
        }

        if (direction === 'next') {
            await this.handleNextPageNavigation(currentPages, chunkKeys, chaptersInChunk);
        } else {
            await this.handlePrevPageNavigation(currentPages, chunkKeys, chaptersInChunk);
        }
    }

    private async handleNextPageNavigation(
        currentPages: Page[],
        chunkKeys: string[],
        chaptersInChunk: string[],
    ): Promise<void> {
        if (this.state.currPage < currentPages.length - 1) {
            const nextPage = currentPages[this.state.currPage + 1];
            this.setState(prev => ({
                ...prev,
                content: nextPage.content,
                currPage: prev.currPage + 1,
            }));
        } else if (this.state.currChapter < chaptersInChunk.length - 1) {
            const nextChapterPath = chaptersInChunk[this.state.currChapter + 1];
            const chapterContent = this.state.chunkCache.get(this.state.currChunk)?.get(nextChapterPath);
            if (chapterContent) {
                const nextChapterPages = this.paginateText(chapterContent, this.state.currChapter + 1);
                this.setState(prev => ({
                    ...prev,
                    pageCache: new Map(prev.pageCache).set(nextChapterPath, nextChapterPages),
                    content: nextChapterPages[0]?.content || chapterContent,
                    currChapter: prev.currChapter + 1,
                    currPage: 0,
                }));
            }
        } else if (this.state.currChunk < chunkKeys.length - 1) {
            await this.loadChunkContent(this.state.currChunk + 1);
        }
    }

    private async handlePrevPageNavigation(
        currentPages: Page[],
        chunkKeys: string[],
        chaptersInChunk: string[],
    ): Promise<void> {
        if (this.state.currPage > 0) {
            const prevPage = currentPages[this.state.currPage - 1];
            this.setState(prev => ({
                ...prev,
                content: prevPage.content,
                currPage: prev.currPage - 1,
            }));
        } else if (this.state.currChapter > 0) {
            const prevChapterPath = chaptersInChunk[this.state.currChapter - 1];
            const chapterContent = this.state.chunkCache.get(this.state.currChunk)?.get(prevChapterPath);
            if (chapterContent) {
                const prevChapterPages = this.paginateText(chapterContent, this.state.currChapter - 1);
                const lastPageIndex = prevChapterPages.length - 1;
                this.setState(prev => ({
                    ...prev,
                    pageCache: new Map(prev.pageCache).set(prevChapterPath, prevChapterPages),
                    content: prevChapterPages[lastPageIndex].content,
                    currChapter: prev.currChapter - 1,
                    currPage: lastPageIndex,
                }));
            }
        } else if (this.state.currChunk > 0) {
            await this.handlePrevChunkNavigation(chunkKeys);
        }
    }

    navigateToSpecificChapter(chunkIndex: number, chapterIndex: number): void {
        if (!this.state.metadata?.chunks) return;

        const chunkKeys = Object.keys(this.state.metadata.chunks);
        const chunkKey = chunkKeys[chunkIndex];
        const chapterPath = this.state.metadata.chunks[chunkKey][chapterIndex];
        const cachedChunk = this.state.chunkCache.get(chunkIndex);

        if (cachedChunk?.has(chapterPath)) {
            const chapterContent = cachedChunk.get(chapterPath)!;
            const chapterPages = this.paginateText(chapterContent, chapterIndex);

            this.setState(prev => ({
                ...prev,
                pageCache: new Map(prev.pageCache).set(chapterPath, chapterPages),
                content: chapterPages[0]?.content || '',
                currChapter: chapterIndex,
                currChunk: chunkIndex,
                currPage: 0,
            }));
        }
    }

    async loadProgress(): Promise<void> {
        if (!this.state.metadata?.chunks) return;

        // const lastReadPosition = storage.getNumber(`books:${this.bookKey}:lastRead`);
        const lastReadPosition = 0;
        const { chapter, chunk, page } = this.getPositionFromIndex(lastReadPosition);

        if (chunk !== this.state.currChunk || chapter !== this.state.currChapter) {
            await this.loadChunkContent(chunk, this.state.metadata);

            setTimeout(() => {
                if (chapter > 0) {
                    this.navigateToSpecificChapter(chunk, chapter);
                }
            }, 100);
        }
    }

    getGlobalPosition(chunkIndex: number, chapterIndex: number, pageIndex: number = 0): number {
        if (!this.state.metadata?.chunks) return 0;

        let position = 0;
        const chunkKeys = Object.keys(this.state.metadata.chunks);

        for (let i = 0; i < chunkIndex; i++) {
            position += this.state.metadata.chunks[chunkKeys[i]].length;
        }

        return position + chapterIndex;
    }

    getPositionFromIndex(index: number): ChapterPosition {
        if (!this.state.metadata?.chunks) return { chapter: 0, chunk: 0, page: 0 };

        let currentIndex = 0;
        const chunkKeys = Object.keys(this.state.metadata.chunks);

        for (let chunkIdx = 0; chunkIdx < chunkKeys.length; chunkIdx++) {
            const chapterCount = this.state.metadata.chunks[chunkKeys[chunkIdx]].length;
            if (currentIndex + chapterCount > index) {
                return {
                    chapter: index - currentIndex,
                    chunk: chunkIdx,
                    page: 0,
                };
            }
            currentIndex += chapterCount;
        }

        return { chapter: 0, chunk: 0, page: 0 };
    }

    getReadingProgress(): { current: number; total: number; percentage: number } {
        if (!this.state.metadata?.chunks) return { current: 0, total: 0, percentage: 0 };

        let totalPages = 0;
        let currentGlobalPage = 0;

        const chunkKeys = Object.keys(this.state.metadata.chunks);

        for (let chunkIdx = 0; chunkIdx < chunkKeys.length; chunkIdx++) {
            const chunkKey = chunkKeys[chunkIdx];
            const chaptersInChunk = this.state.metadata.chunks[chunkKey];

            for (let chapterIdx = 0; chapterIdx < chaptersInChunk.length; chapterIdx++) {
                const chapterPath = chaptersInChunk[chapterIdx];
                const pages = this.state.pageCache.get(chapterPath);
                const pageCount = pages?.length || 1;

                if (
                    chunkIdx < this.state.currChunk ||
                    (chunkIdx === this.state.currChunk && chapterIdx < this.state.currChapter)
                ) {
                    currentGlobalPage += pageCount;
                } else if (chunkIdx === this.state.currChunk && chapterIdx === this.state.currChapter) {
                    currentGlobalPage += this.state.currPage + 1;
                }

                totalPages += pageCount;
            }
        }

        return {
            current: currentGlobalPage,
            total: totalPages,
            percentage: totalPages > 0 ? (currentGlobalPage / totalPages) * 100 : 0,
        };
    }

    updatePaginationConfig(newConfig: Partial<PaginationConfig>): void {
        this.paginationConfig = { ...this.paginationConfig, ...newConfig };

        this.paginationConfig.wordsPerPage = this.calculateWordsPerPage();

        this.setState(prev => ({
            ...prev,
            pageCache: new Map(),
        }));

        if (this.state.metadata?.chunks) {
            const chunkKeys = Object.keys(this.state.metadata.chunks);
            const currentChunkKey = chunkKeys[this.state.currChunk];
            const chaptersInChunk = this.state.metadata.chunks[currentChunkKey];
            const currentChapterPath = chaptersInChunk[this.state.currChapter];

            const chapterContent = this.state.chunkCache.get(this.state.currChunk)?.get(currentChapterPath);
            if (chapterContent) {
                const newPages = this.paginateText(chapterContent, this.state.currChapter);
                this.setState(prev => ({
                    ...prev,
                    pageCache: new Map(prev.pageCache).set(currentChapterPath, newPages),
                    content: newPages[0]?.content || '',
                    currPage: 0,
                }));
            }
        }
    }

    saveProgress(): void {
        const progress = this.getReadingProgress();
        storage.set(
            `books:${this.bookKey}:lastRead`,
            JSON.stringify({
                chunk: this.state.currChunk,
                chapter: this.state.currChapter,
                page: this.state.currPage,
                globalPage: progress.current,
            }),
        );
    }

    private async handlePrevChunkNavigation(chunkKeys: string[]): Promise<void> {
        const prevChunkIndex = this.state.currChunk - 1;
        const prevChunkKey = chunkKeys[prevChunkIndex];
        const prevChunkChapters = this.state.metadata!.chunks![prevChunkKey];

        if (this.state.chunkCache.has(prevChunkIndex)) {
            const lastChapterIndex = prevChunkChapters.length - 1;
            const lastChapterPath = prevChunkChapters[lastChapterIndex];
            const chapterContent = this.state.chunkCache.get(prevChunkIndex)?.get(lastChapterPath);

            if (chapterContent) {
                const lastChapterPages = this.paginateText(chapterContent, lastChapterIndex);
                const lastPageIndex = lastChapterPages.length - 1;

                this.setState(prev => ({
                    ...prev,
                    pageCache: new Map(prev.pageCache).set(lastChapterPath, lastChapterPages),
                    content: lastChapterPages[lastPageIndex].content,
                    currChapter: lastChapterIndex,
                    currChunk: prevChunkIndex,
                    currPage: lastPageIndex,
                }));
            }
        } else {
            await this.loadChunkContent(prevChunkIndex);

            const lastChapterIndex = prevChunkChapters.length - 1;
            const lastChapterPath = prevChunkChapters[lastChapterIndex];
            const chapterContent = this.state.chunkCache.get(prevChunkIndex)?.get(lastChapterPath);

            if (chapterContent) {
                const lastChapterPages = this.paginateText(chapterContent, lastChapterIndex);
                const lastPageIndex = lastChapterPages.length - 1;

                this.setState(prev => ({
                    ...prev,
                    pageCache: new Map(prev.pageCache).set(lastChapterPath, lastChapterPages),
                    content: lastChapterPages[lastPageIndex].content,
                    currChapter: lastChapterIndex,
                    currPage: lastPageIndex,
                }));
            }
        }
    }

    private setLoading(loading: boolean): void {
        this.setState(prev => ({ ...prev, loading }));
    }

    private setError(error: string | null): void {
        this.setState(prev => ({ ...prev, error }));
    }
}

export const generateWebViewHTML = (content: string, customCSS?: string): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>
        body {
            font-family: Georgia, serif;
            line-height: 1.6;
            margin: 20px;
            padding: 0;
            background: #fff;
            color: #333;
            font-size: 16px;
            overflow: hidden;
            height: 100vh;
            box-sizing: border-box;
        }
        p {
            margin-bottom: 1em;
            text-align: justify;
        }
        img {
            max-width: 100%;
            height: auto;
        }

        .content-wrapper {
            height: 100vh;
            overflow: hidden;
            box-sizing: border-box;
            padding: 20px;
            margin: -20px;
        }
        ${customCSS || ''}
    </style>
    <script>
        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let isScrolling = false;

        // Prevent default scrolling behavior
        document.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });

        // Track touch start
        document.addEventListener('touchstart', function(e) {
            touchStartTime = Date.now();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isScrolling = false;
        }, { passive: false });

        // Track if user is trying to scroll
        document.addEventListener('touchmove', function(e) {
            if (!isScrolling) {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const xDiff = Math.abs(touchX - touchStartX);
                const yDiff = Math.abs(touchY - touchStartY);

                // If movement is more vertical than horizontal, consider it scrolling
                if (yDiff > xDiff && yDiff > 10) {
                    isScrolling = true;
                }
            }
        }, { passive: false });

        // Handle gestures
        document.addEventListener('touchend', function(e) {
            const touchEndTime = Date.now();
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const timeDiff = touchEndTime - touchStartTime;
            const xDiff = Math.abs(touchEndX - touchStartX);
            const yDiff = Math.abs(touchEndY - touchStartY);

            // Check if we're clicking on an interactive element
            const target = e.target;
            const isInteractive = target.tagName === 'A' ||
                                target.tagName === 'BUTTON' ||
                                target.closest('a') ||
                                target.closest('button') ||
                                target.hasAttribute('onclick');

            // Only handle navigation if it's a quick tap, not a scroll, and not on interactive elements
            if (timeDiff < 300 && !isScrolling && xDiff < 30 && yDiff < 30 && !isInteractive) {
                const screenWidth = window.innerWidth;
                const leftThird = screenWidth / 3;
                const rightThird = (screenWidth * 2) / 3;

                if (touchEndX < leftThird) {
                    window.ReactNativeWebView.postMessage('prev');
                } else if (touchEndX > rightThird) {
                    window.ReactNativeWebView.postMessage('next');
                } else {
                    window.ReactNativeWebView.postMessage('middle');
                }
            }
        }, { passive: false });

        // Ensure content fits on screen when loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Force scroll to top
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
        });
    </script>
    </head>
    <body>
        <div class="content-wrapper">
            ${content}
        </div>
    </body>
    </html>
  `;
};
