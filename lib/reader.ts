import { storage } from '@/lib/mmkv';
import { Metadata } from '@/modules/CalicoParser';
import { getChunks, parseChunk } from '@/lib/epub';

export interface ReaderState {
    content: string;
    loading: boolean;
    currChunk: number;
    currChapter: number;
    error: string | null;
    metadata: Metadata | null;
    chunkCache: Map<number, Map<string, string>>;
}

export interface ChapterPosition {
    chunk: number;
    chapter: number;
}

export class ReaderManager {
    private bookKey: string;
    private state: ReaderState;
    private setState: (updater: (prev: ReaderState) => ReaderState) => void;

    constructor(bookKey: string, state: ReaderState, setState: (updater: (prev: ReaderState) => ReaderState) => void) {
        this.bookKey = bookKey;
        this.state = state;
        this.setState = setState;
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

        // Check cache first
        if (this.state.chunkCache.has(chunkIndex)) {
            const cachedChunk = this.state.chunkCache.get(chunkIndex)!;
            const chunkKey = chunkKeys[chunkIndex];
            const firstChapterPath = bookMetadata.chunks[chunkKey][0];

            this.setState(prev => ({
                ...prev,
                content: cachedChunk.get(firstChapterPath) || '',
                currChapter: 0,
                currChunk: chunkIndex,
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

            this.setState(prev => ({
                ...prev,
                chunkCache: new Map(prev.chunkCache).set(chunkIndex, chunkMap),
                content: chapterContents[firstChapterPath] || '',
                currChapter: 0,
                currChunk: chunkIndex,
            }));
        } catch (error) {
            console.error('Failed to load chunk:', error);
            this.setError('Failed to load chapter');
        } finally {
            this.setLoading(false);
        }
    }

    async navigateToChapter(direction: 'next' | 'prev'): Promise<void> {
        if (!this.state.metadata?.chunks) return;

        const chunkKeys = Object.keys(this.state.metadata.chunks);
        const currentChunkKey = chunkKeys[this.state.currChunk];
        const chaptersInChunk = this.state.metadata.chunks[currentChunkKey];

        if (direction === 'next') {
            await this.handleNextNavigation(chunkKeys, chaptersInChunk);
        } else {
            await this.handlePrevNavigation(chunkKeys, chaptersInChunk);
        }
    }

    navigateToSpecificChapter(chunkIndex: number, chapterIndex: number): void {
        if (!this.state.metadata?.chunks) return;

        const chunkKeys = Object.keys(this.state.metadata.chunks);
        const chunkKey = chunkKeys[chunkIndex];
        const chapterPath = this.state.metadata.chunks[chunkKey][chapterIndex];
        const cachedChunk = this.state.chunkCache.get(chunkIndex);

        if (cachedChunk?.has(chapterPath)) {
            this.setState(prev => ({
                ...prev,
                content: cachedChunk.get(chapterPath)!,
                currChapter: chapterIndex,
                currChunk: chunkIndex,
            }));
        }
    }

    async loadProgress(): Promise<void> {
        if (!this.state.metadata?.chunks) return;

        // const lastReadPosition = storage.getNumber(`books:${this.bookKey}:lastRead`);
        const lastReadPosition = 0;
        const { chapter, chunk } = this.getPositionFromIndex(lastReadPosition);

        if (chunk !== this.state.currChunk || chapter !== this.state.currChapter) {
            await this.loadChunkContent(chunk, this.state.metadata);

            setTimeout(() => {
                if (chapter > 0) {
                    this.navigateToSpecificChapter(chunk, chapter);
                }
            }, 100);
        }
    }

    getGlobalPosition(chunkIndex: number, chapterIndex: number): number {
        if (!this.state.metadata?.chunks) return 0;

        let position = 0;
        const chunkKeys = Object.keys(this.state.metadata.chunks);

        for (let i = 0; i < chunkIndex; i++) {
            position += this.state.metadata.chunks[chunkKeys[i]].length;
        }

        return position + chapterIndex;
    }

    getPositionFromIndex(index: number): ChapterPosition {
        if (!this.state.metadata?.chunks) return { chapter: 0, chunk: 0 };

        let currentIndex = 0;
        const chunkKeys = Object.keys(this.state.metadata.chunks);

        for (let chunkIdx = 0; chunkIdx < chunkKeys.length; chunkIdx++) {
            const chapterCount = this.state.metadata.chunks[chunkKeys[chunkIdx]].length;
            if (currentIndex + chapterCount > index) {
                return {
                    chapter: index - currentIndex,
                    chunk: chunkIdx,
                };
            }
            currentIndex += chapterCount;
        }

        return { chapter: 0, chunk: 0 };
    }

    saveProgress(): void {
        const globalPosition = this.getGlobalPosition(this.state.currChunk, this.state.currChapter);
        storage.set(`books:${this.bookKey}:lastRead`, globalPosition);
    }

    private async handleNextNavigation(chunkKeys: string[], chaptersInChunk: string[]): Promise<void> {
        if (this.state.currChapter < chaptersInChunk.length - 1) {
            // Next chapter in same chunk
            const newChapterIndex = this.state.currChapter + 1;
            const chapterPath = chaptersInChunk[newChapterIndex];
            const cachedChunk = this.state.chunkCache.get(this.state.currChunk);

            if (cachedChunk?.has(chapterPath)) {
                this.setState(prev => ({
                    ...prev,
                    content: cachedChunk.get(chapterPath)!,
                    currChapter: newChapterIndex,
                }));
            }
        } else if (this.state.currChunk < chunkKeys.length - 1) {
            // Next chunk
            await this.loadChunkContent(this.state.currChunk + 1);
        }
    }

    private async handlePrevNavigation(chunkKeys: string[], chaptersInChunk: string[]): Promise<void> {
        if (this.state.currChapter > 0) {
            // Previous chapter in same chunk
            const newChapterIndex = this.state.currChapter - 1;
            const chapterPath = chaptersInChunk[newChapterIndex];
            const cachedChunk = this.state.chunkCache.get(this.state.currChunk);

            if (cachedChunk?.has(chapterPath)) {
                this.setState(prev => ({
                    ...prev,
                    content: cachedChunk.get(chapterPath)!,
                    currChapter: newChapterIndex,
                }));
            }
        } else if (this.state.currChunk > 0) {
            // Previous chunk - go to last chapter
            await this.handlePrevChunkNavigation(chunkKeys);
        }
    }

    private async handlePrevChunkNavigation(chunkKeys: string[]): Promise<void> {
        const prevChunkIndex = this.state.currChunk - 1;
        const prevChunkKey = chunkKeys[prevChunkIndex];
        const prevChunkChapters = this.state.metadata!.chunks![prevChunkKey];

        if (this.state.chunkCache.has(prevChunkIndex)) {
            // Already cached
            const lastChapterIndex = prevChunkChapters.length - 1;
            const lastChapterPath = prevChunkChapters[lastChapterIndex];
            const cachedChunk = this.state.chunkCache.get(prevChunkIndex);

            if (cachedChunk?.has(lastChapterPath)) {
                this.setState(prev => ({
                    ...prev,
                    content: cachedChunk.get(lastChapterPath)!,
                    currChapter: lastChapterIndex,
                    currChunk: prevChunkIndex,
                }));
            }
        } else {
            // Load previous chunk
            await this.loadChunkContent(prevChunkIndex);

            const lastChapterIndex = prevChunkChapters.length - 1;
            const lastChapterPath = prevChunkChapters[lastChapterIndex];
            const cachedChunk = this.state.chunkCache.get(prevChunkIndex);

            if (cachedChunk?.has(lastChapterPath)) {
                this.setState(prev => ({
                    ...prev,
                    content: cachedChunk.get(lastChapterPath)!,
                    currChapter: lastChapterIndex,
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
    ${customCSS ? `<style>${customCSS}</style>` : ''}
    <script>
   		// Variables to track touch events
                let touchStartTime = 0;
                let touchStartX = 0;
                let touchStartY = 0;

                // Track touch start
                document.addEventListener('touchstart', function(e) {
                    touchStartTime = Date.now();
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                });

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

                    // Only handle navigation if it's a tap and NOT on interactive elements
                    if (timeDiff < 300 && xDiff < 10 && yDiff < 10 && !isInteractive) {
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
                });
    </script>
    </head>
    <body>
    	${content}
    </body>
    </html>
  `;
};
