import { storage } from '@/lib/mmkv';
import { Metadata } from '@/modules/CalicoParser';
import { getChunks, parseChunk } from '@/lib/epub';

export interface ReaderState {
    chapterContents: { [path: string]: string };
    chapterPaths: string[];
    loading: boolean;
    currChunk: number;
    currChapter: number;
    currPage: number;
    currChapterPath: string;
    totalChapters: number;
    totalPagesInChapter: number;
    error: string | null;
    metadata: Metadata | null;
    chunkCache: Map<number, { [path: string]: string }>; // Fixed type
}

export interface ChapterPosition {
    chunk: number;
    chapter: number;
    page: number;
    chapterPath: string;
}

export class ReaderManager {
    private bookKey: string;
    public state: ReaderState;
    private setState: (updater: (prev: ReaderState) => ReaderState) => void;
    private webViewRef: any;

    constructor(
        bookKey: string,
        state: ReaderState,
        setState: (updater: (prev: ReaderState) => ReaderState) => void,
        webViewRef?: any,
    ) {
        this.bookKey = bookKey;
        this.state = state;
        this.setState = setState;
        this.webViewRef = webViewRef;
    }

    nextPage(): void {
        if (this.webViewRef?.current) {
            this.webViewRef.current.postMessage(JSON.stringify({ type: 'nextPage' }));
        }
    }

    prevPage(): void {
        if (this.webViewRef?.current) {
            this.webViewRef.current.postMessage(JSON.stringify({ type: 'prevPage' }));
        }
    }

    goToChapter(chapterIndex: number): void {
        if (this.webViewRef?.current) {
            this.webViewRef.current.postMessage(
                JSON.stringify({
                    type: 'goToChapter',
                    chapterIndex,
                }),
            );
        }
    }

    // Fixed: Added missing message handlers
    handleWebViewMessage(message: string): void {
        try {
            const data = JSON.parse(message);

            if (data.type === 'pageInfo') {
                this.setState(prev => ({
                    ...prev,
                    currChapter: data.currentChapter,
                    currPage: data.currentPage - 1, // Convert from 1-based to 0-based
                    currChapterPath: data.chapterPath,
                    totalChapters: data.totalChapters,
                    totalPagesInChapter: data.totalPagesInChapter,
                }));
            } else if (data.type === 'loadNextChunk') {
                this.loadNextChunk();
            } else if (data.type === 'loadPrevChunk') {
                this.loadPrevChunk();
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
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
                metadata = { ...metadata, chunks: chunks };
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
        if (chunkIndex >= chunkKeys.length || chunkIndex < 0) return;

        try {
            const chunkKey = chunkKeys[chunkIndex];
            const chapterPaths = bookMetadata.chunks[chunkKey];

            // Check if we have cached content for this chunk
            let chapterContents = this.state.chunkCache.get(chunkIndex);

            if (!chapterContents) {
                chapterContents = await parseChunk(bookMetadata.path, chapterPaths);

                // Cache the content
                this.setState(prev => {
                    const newCache = new Map(prev.chunkCache);
                    newCache.set(chunkIndex, chapterContents!);
                    return { ...prev, chunkCache: newCache };
                });
            }

            this.setState(prev => ({
                ...prev,
                chapterContents: chapterContents || {},
                chapterPaths,
                currChunk: chunkIndex,
                currChapter: 0,
                currPage: 0,
                currChapterPath: chapterPaths[0] || '',
                totalChapters: chapterPaths.length,
                totalPagesInChapter: 0,
            }));

            // Fixed: Notify WebView of content change after state update
            setTimeout(() => {
                this.notifyContentRefresh();
            }, 100);
        } catch (error) {
            console.error('Failed to load chunk:', error);
            this.setError('Failed to load chapter');
        } finally {
            this.setLoading(false);
        }
    }

    // Fixed: Added WebView content refresh notification
    private notifyContentRefresh(): void {
        if (this.webViewRef?.current) {
            this.webViewRef.current.postMessage(
                JSON.stringify({
                    type: 'refreshContent',
                }),
            );
        }
    }

    async loadNextChunk(): Promise<boolean> {
        if (!this.state.metadata?.chunks) return false;

        const chunkKeys = Object.keys(this.state.metadata.chunks);
        const nextChunkIndex = this.state.currChunk + 1;

        if (nextChunkIndex >= chunkKeys.length) return false;

        await this.loadChunkContent(nextChunkIndex);
        return true;
    }

    async loadPrevChunk(): Promise<boolean> {
        if (!this.state.metadata?.chunks) return false;

        const prevChunkIndex = this.state.currChunk - 1;

        if (prevChunkIndex < 0) return false;

        await this.loadChunkContent(prevChunkIndex);

        // Fixed: Navigate to last chapter of previous chunk
        setTimeout(() => {
            if (this.webViewRef?.current) {
                this.webViewRef.current.postMessage(
                    JSON.stringify({
                        type: 'goToPosition',
                        chapter: this.state.chapterPaths.length - 1,
                        page: 0,
                    }),
                );
            }
        }, 200);

        return true;
    }

    // Helper method to get current chapter position
    getCurrentPosition(): ChapterPosition {
        return {
            chunk: this.state.currChunk,
            chapter: this.state.currChapter,
            page: this.state.currPage,
            chapterPath: this.state.currChapterPath,
        };
    }

    // Helper method to save reading position
    savePosition(): void {
        const position = this.getCurrentPosition();
        storage.set(`position:${this.bookKey}`, JSON.stringify(position));
    }

    // Helper method to load saved position
    loadSavedPosition(): ChapterPosition | null {
        try {
            const raw = storage.getString(`position:${this.bookKey}`);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    // Fixed: Added position restoration method
    async restorePosition(): Promise<void> {
        const savedPosition = this.loadSavedPosition();
        if (savedPosition && this.webViewRef?.current) {
            // If saved position is in a different chunk, load that chunk first
            if (savedPosition.chunk !== this.state.currChunk) {
                await this.loadChunkContent(savedPosition.chunk);
            }

            // Navigate to the saved position
            setTimeout(() => {
                if (this.webViewRef?.current) {
                    this.webViewRef.current.postMessage(
                        JSON.stringify({
                            type: 'goToPosition',
                            chapter: savedPosition.chapter,
                            page: savedPosition.page,
                        }),
                    );
                }
            }, 300);
        }
    }

    private setLoading(loading: boolean): void {
        this.setState(prev => ({ ...prev, loading }));
    }

    private setError(error: string | null): void {
        this.setState(prev => ({ ...prev, error }));
    }
}
