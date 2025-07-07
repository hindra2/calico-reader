import { useRef, useCallback, useState, useEffect } from 'react';
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
    webViewReady: boolean;
}

interface WebViewMessage {
    type: 'pageInfo' | 'loadNextChunk' | 'loadPrevChunk' | 'webViewReady';
    currentChapter?: number;
    currentPage?: number;
    chapterPath?: string;
    totalChapters?: number;
    totalPagesInChapter?: number;
}

export const useEpubReader = (bookKey: string, webViewRef: any) => {
    const [state, setState] = useState<ReaderState>({
        chapterContents: {},
        chapterPaths: [],
        loading: false,
        currChunk: 0,
        currChapter: 0,
        currPage: 0,
        currChapterPath: '',
        totalChapters: 0,
        totalPagesInChapter: 0,
        error: null,
        metadata: null,
        webViewReady: false,
    });

    // Cache management
    const chunkCacheRef = useRef<Map<number, { [path: string]: string }>>(new Map());
    const pendingOperationsRef = useRef<
        Array<{
            type: string;
            data: any;
            resolve: () => void;
            reject: (error: Error) => void;
        }>
    >([]);
    const operationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const MAX_CACHE_SIZE = 5;
    const OPERATION_TIMEOUT = 5000;

    // Utility functions
    const setLoading = useCallback((loading: boolean) => {
        setState(prev => ({ ...prev, loading }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setState(prev => ({ ...prev, error }));
    }, []);

    // WebView communication
    const sendWebViewMessage = useCallback(
        async (message: any): Promise<void> => {
            return new Promise((resolve, reject) => {
                if (!webViewRef?.current) {
                    reject(new Error('WebView not available'));
                    return;
                }

                if (!state.webViewReady) {
                    // Queue operation for when WebView is ready
                    pendingOperationsRef.current.push({
                        type: message.type,
                        data: message,
                        resolve,
                        reject,
                    });
                    return;
                }

                const timeoutId = setTimeout(() => {
                    reject(new Error(`WebView operation timed out: ${message.type}`));
                }, OPERATION_TIMEOUT);

                operationTimeoutsRef.current.set(message.type, timeoutId);

                try {
                    webViewRef.current.postMessage(JSON.stringify(message));

                    // For navigation operations, resolve immediately
                    if (['nextPage', 'prevPage', 'goToChapter', 'goToPosition'].includes(message.type)) {
                        clearTimeout(timeoutId);
                        operationTimeoutsRef.current.delete(message.type);
                        resolve();
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    operationTimeoutsRef.current.delete(message.type);
                    reject(error);
                }
            });
        },
        [state.webViewReady, webViewRef],
    );

    // Navigation
    const nextPage = useCallback(async (): Promise<void> => {
        return sendWebViewMessage({ type: 'nextPage' });
    }, [sendWebViewMessage]);

    const prevPage = useCallback(async (): Promise<void> => {
        return sendWebViewMessage({ type: 'prevPage' });
    }, [sendWebViewMessage]);

    const goToChapter = useCallback(
        async (chapterIndex: number): Promise<void> => {
            if (chapterIndex < 0 || chapterIndex >= state.totalChapters) {
                throw new Error(`Invalid chapter index: ${chapterIndex}`);
            }
            return sendWebViewMessage({ type: 'goToChapter', chapterIndex });
        },
        [sendWebViewMessage, state.totalChapters],
    );

    const goToPosition = useCallback(
        async (chapter: number, page: number): Promise<void> => {
            return sendWebViewMessage({ type: 'goToPosition', chapter, page });
        },
        [sendWebViewMessage],
    );

    // Chunk management
    const loadChunkContent = useCallback(
        async (chunkIndex: number, meta?: Metadata): Promise<void> => {
            const bookMetadata = meta || state.metadata;

            if (!bookMetadata?.chunks) {
                console.error('No book metadata available:', { bookMetadata, state: state.metadata });
                throw new Error('No book metadata available');
            }

            const chunkKeys = Object.keys(bookMetadata.chunks);
            if (chunkIndex >= chunkKeys.length || chunkIndex < 0) {
                throw new Error(`Invalid chunk index: ${chunkIndex}`);
            }

            setLoading(true);
            setError(null);

            try {
                const chunkKey = chunkKeys[chunkIndex];
                const chapterPaths = bookMetadata.chunks[chunkKey];

                let chapterContents = chunkCacheRef.current.get(chunkIndex);

                if (!chapterContents) {
                    // Load chunk content
                    chapterContents = await parseChunk(bookMetadata.path, chapterPaths);

                    // Update cache with cleanup (LRU)
                    if (chunkCacheRef.current.size >= MAX_CACHE_SIZE) {
                        const firstKey = chunkCacheRef.current.keys().next().value;
                        if (firstKey !== undefined) {
                            chunkCacheRef.current.delete(firstKey);
                        }
                    }

                    chunkCacheRef.current.set(chunkIndex, chapterContents);
                }

                // Update state
                setState(prev => ({
                    ...prev,
                    chapterContents: chapterContents!,
                    chapterPaths,
                    currChunk: chunkIndex,
                    currChapterPath: chapterPaths[0] || '',
                    totalChapters: chapterPaths.length,
                    totalPagesInChapter: 0,
                    error: null,
                }));
            } catch (error) {
                console.error('Failed to load chunk:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to load chapter';
                setError(errorMessage);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [state.metadata, setLoading, setError],
    );

    const loadNextChunk = useCallback(async (): Promise<boolean> => {
        if (!state.metadata?.chunks) {
            console.log('No metadata available for next chunk');
            return false;
        }

        const chunkKeys = Object.keys(state.metadata.chunks);
        const nextChunkIndex = state.currChunk + 1;

        if (nextChunkIndex >= chunkKeys.length) {
            console.log('Already at last chunk');
            return false;
        }

        try {
            await loadChunkContent(nextChunkIndex);
            return true;
        } catch (error) {
            console.error('Failed to load next chunk:', error);
            return false;
        }
    }, [state.metadata, state.currChunk, loadChunkContent]);

    const loadPrevChunk = useCallback(async (): Promise<boolean> => {
        if (!state.metadata?.chunks) {
            console.log('No metadata available for prev chunk');
            return false;
        }

        const prevChunkIndex = state.currChunk - 1;
        if (prevChunkIndex < 0) {
            return false;
        }

        try {
            await loadChunkContent(prevChunkIndex);

            // Wait for content to load
            setTimeout(async () => {
                try {
                    await goToPosition(state.chapterPaths.length - 1, 0);
                } catch (error) {
                    console.error('Failed to navigate to last chapter:', error);
                }
            }, 200);

            return true;
        } catch (error) {
            console.error('Failed to load previous chunk:', error);
            return false;
        }
    }, [state.metadata, state.currChunk, state.chapterPaths.length, loadChunkContent, goToPosition]);

    // Document loading
    const loadDocument = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const raw = storage.getString('books:' + bookKey);
            if (!raw) {
                throw new Error('Book not found in storage');
            }

            let metadata: Metadata;
            try {
                metadata = JSON.parse(raw);
            } catch (error) {
                throw new Error('Invalid book metadata format');
            }

            // Ensure chunks exist
            if (!metadata.chunks || Object.keys(metadata.chunks).length === 0) {
                try {
                    const chunks = await getChunks(metadata.path);
                    metadata = { ...metadata, chunks: chunks };
                    storage.set('books:' + bookKey, JSON.stringify(metadata));
                } catch (error) {
                    throw new Error('Failed to process book chapters');
                }
            }

            setState(prev => ({ ...prev, metadata }));
            await loadChunkContent(0, metadata);
        } catch (error) {
            console.error('Failed to load EPUB:', error);
            setError(error instanceof Error ? error.message : 'Failed to load book');
            throw error;
        } finally {
            setLoading(false);
        }
    }, [bookKey, setLoading, setError, loadChunkContent]);

    // WebView message handling
    const handleWebViewMessage = useCallback(
        (message: string): void => {
            try {
                const data: WebViewMessage = JSON.parse(message);

                switch (data.type) {
                    case 'webViewReady':
                        setState(prev => ({ ...prev, webViewReady: true }));

                        // Process pending operations
                        const operations = [...pendingOperationsRef.current];
                        pendingOperationsRef.current = [];

                        operations.forEach(op => {
                            sendWebViewMessage(op.data).then(op.resolve).catch(op.reject);
                        });
                        break;

                    case 'pageInfo':
                        // Clear any pending timeouts for page info requests
                        const timeoutId = operationTimeoutsRef.current.get('pageInfo');
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            operationTimeoutsRef.current.delete('pageInfo');
                        }

                        setState(prev => ({
                            ...prev,
                            currChapter: data.currentChapter ?? prev.currChapter,
                            currPage: (data.currentPage ?? 1) - 1,
                            currChapterPath: data.chapterPath ?? prev.currChapterPath,
                            totalChapters: data.totalChapters ?? prev.totalChapters,
                            totalPagesInChapter: data.totalPagesInChapter ?? prev.totalPagesInChapter,
                        }));
                        break;

                    case 'loadNextChunk':
                        loadNextChunk().catch(error => {
                            console.error('Failed to load next chunk:', error);
                            setError('Failed to load next section');
                        });
                        break;

                    case 'loadPrevChunk':
                        loadPrevChunk().catch(error => {
                            console.error('Failed to load previous chunk:', error);
                            setError('Failed to load previous section');
                        });
                        break;

                    default:
                        console.warn('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error parsing WebView message:', error);
                setError('Communication error with reader');
            }
        },
        [loadNextChunk, loadPrevChunk, sendWebViewMessage, setError],
    );

    // Cleanup
    const cleanup = useCallback(() => {
        // Clear all timeouts
        operationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        operationTimeoutsRef.current.clear();

        // Reject pending operations
        pendingOperationsRef.current.forEach(op => {
            op.reject(new Error('Reader was cleaned up'));
        });
        pendingOperationsRef.current = [];

        // Clear cache
        chunkCacheRef.current.clear();
    }, []);

    // Initialize on mount
    useEffect(() => {
        loadDocument();

        return cleanup;
    }, [bookKey]); // Only depend on bookKey

    return {
        state,
        nextPage,
        prevPage,
        goToChapter,
        handleWebViewMessage,
        cleanup,
    };
};
