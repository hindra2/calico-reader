import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Dimensions, Text, ScrollView, View, ActivityIndicator } from 'react-native';

import { storage } from '@/lib/mmkv';
import { loadChapter, getChunks, parseChunk } from '@/lib/epub';
import { Metadata } from '@/modules/CalicoParser';
import { navigate } from 'expo-router/build/global-state/routing';

interface EpubReaderProps {
    bookKey: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

const screenHeight = Dimensions.get('screen').height;
const screenWidth = Dimensions.get('screen').width;

const Reader: React.FC<EpubReaderProps> = ({ bookKey, onTapMiddle }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<Metadata | null>(null);
    const [currChunk, setCurrChunk] = useState<number>(0);
    const [currChapter, setCurrChapter] = useState<number>(0);

    const [chunkCache, setChunkCache] = useState<Map<number, Map<string, string>>>(new Map());

    const loadDocument = useCallback(async () => {
        try {
            setLoading(true);
            const raw = await storage.getString('books:' + bookKey);
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
                storage.set('books:' + bookKey, JSON.stringify(metadata));
            }

            setMetadata(metadata);
            await loadChunkContent(0, metadata);
        } catch (error) {
            console.error('Failed to load EPUB:', error);
        } finally {
            setLoading(false);
        }
    }, [bookKey]);

    useEffect(() => {
        loadDocument();
    }, [loadDocument]);

    const loadChunkContent = useCallback(
        async (chunkIndex: number, meta?: Metadata) => {
            const bookMetadata = meta || metadata;
            if (!bookMetadata?.chunks) return;

            const chunkKeys = Object.keys(bookMetadata.chunks);
            if (chunkIndex >= chunkKeys.length) return;

            if (chunkCache.has(chunkIndex)) {
                const cachedChunk = chunkCache.get(chunkIndex)!;
                const chunkKey = chunkKeys[chunkIndex];
                const firstChapterPath = bookMetadata.chunks[chunkKey][0];
                setContent(cachedChunk.get(firstChapterPath) || '');
                setCurrChunk(chunkIndex);
                setCurrChapter(0);
                return;
            }

            try {
                setLoading(true);
                const chunkKey = chunkKeys[chunkIndex];
                const chapterPaths = bookMetadata.chunks[chunkKey];

                const chapterContents = await parseChunk(bookMetadata.path, chapterPaths);

                const chunkMap = new Map<string, string>();
                Object.entries(chapterContents).forEach(([path, content]) => {
                    chunkMap.set(path, content);
                });

                setChunkCache(prev => new Map(prev).set(chunkIndex, chunkMap));

                const firstChapterPath = chapterPaths[0];
                setContent(chapterContents[firstChapterPath] || '');
                setCurrChunk(chunkIndex);
                setCurrChapter(0);
            } catch (error) {
                console.error('Failed to load chunk:', error);
                setError('Failed to load chapter');
            } finally {
                setLoading(false);
            }
        },
        [metadata, chunkCache],
    );

    const navigateToChapter = useCallback(
        (direction: 'next' | 'prev') => {
            if (!metadata?.chunks) return;

            const chunkKeys = Object.keys(metadata.chunks);
            const currentChunkKey = chunkKeys[currChunk];
            const chaptersInChunk = metadata.chunks[currentChunkKey];

            if (direction === 'next') {
                if (currChapter < chaptersInChunk.length - 1) {
                    // Next chapter in same chunk
                    const newChapterIndex = currChapter + 1;
                    const chapterPath = chaptersInChunk[newChapterIndex];
                    const cachedChunk = chunkCache.get(currChunk);

                    if (cachedChunk?.has(chapterPath)) {
                        setContent(cachedChunk.get(chapterPath)!);
                        setCurrChapter(newChapterIndex);

                        // Save progress
                        const globalPosition = getGlobalPosition(currChunk, newChapterIndex);
                        // storage.set(`books:${bookKey}:lastRead`, globalPosition);
                    }
                } else if (currChunk < chunkKeys.length - 1) {
                    // Next chunk
                    loadChunkContent(currChunk + 1);
                }
            } else {
                // prev
                if (currChapter > 0) {
                    // Previous chapter in same chunk
                    const newChapterIndex = currChapter - 1;
                    const chapterPath = chaptersInChunk[newChapterIndex];
                    const cachedChunk = chunkCache.get(currChunk);

                    if (cachedChunk?.has(chapterPath)) {
                        setContent(cachedChunk.get(chapterPath)!);
                        setCurrChapter(newChapterIndex);

                        // Save progress
                        const globalPosition = getGlobalPosition(currChunk, newChapterIndex);
                        // storage.set(`books:${bookKey}:lastRead`, globalPosition);
                    }
                } else if (currChunk > 0) {
                    // Previous chunk - need to load and go to last chapter
                    const prevChunkIndex = currChunk - 1;
                    const prevChunkKey = chunkKeys[prevChunkIndex];
                    const prevChunkChapters = metadata.chunks[prevChunkKey];

                    if (chunkCache.has(prevChunkIndex)) {
                        // Already cached
                        const lastChapterIndex = prevChunkChapters.length - 1;
                        const lastChapterPath = prevChunkChapters[lastChapterIndex];
                        const cachedChunk = chunkCache.get(prevChunkIndex);

                        if (cachedChunk?.has(lastChapterPath)) {
                            setContent(cachedChunk.get(lastChapterPath)!);
                            setCurrChunk(prevChunkIndex);
                            setCurrChapter(lastChapterIndex);

                            // Save progress
                            const globalPosition = getGlobalPosition(prevChunkIndex, lastChapterIndex);
                            // storage.set(`books:${bookKey}:lastRead`, globalPosition);
                        }
                    } else {
                        // Load previous chunk
                        loadChunkContent(prevChunkIndex).then(() => {
                            const lastChapterIndex = prevChunkChapters.length - 1;
                            const lastChapterPath = prevChunkChapters[lastChapterIndex];
                            const cachedChunk = chunkCache.get(prevChunkIndex);

                            if (cachedChunk?.has(lastChapterPath)) {
                                setContent(cachedChunk.get(lastChapterPath)!);
                                setCurrChapter(lastChapterIndex);

                                // Save progress
                                const globalPosition = getGlobalPosition(prevChunkIndex, lastChapterIndex);
                                // storage.set(`books:${bookKey}:lastRead`, globalPosition);
                            }
                        });
                    }
                }
            }
        },
        [metadata, currChunk, currChapter, chunkCache, bookKey, loadChunkContent],
    );

    // Helper to calculate global position for progress saving
    const getGlobalPosition = useCallback(
        (chunkIndex: number, chapterIndex: number): number => {
            if (!metadata?.chunks) return 0;

            let position = 0;
            const chunkKeys = Object.keys(metadata.chunks);

            // Add chapters from previous chunks
            for (let i = 0; i < chunkIndex; i++) {
                position += metadata.chunks[chunkKeys[i]].length;
            }

            // Add current chapter position
            return position + chapterIndex;
        },
        [metadata],
    );

    useEffect(() => {
        const loadProgress = async () => {
            if (!metadata?.chunks) return;

            // const lastReadPosition = storage.getNumber(`books:${bookKey}:lastRead`) || 0;
            const lastReadPosition = 0;
            const { chunk, chapter } = getPositionFromIndex(lastReadPosition);

            if (chunk !== currChunk || chapter !== currChapter) {
                await loadChunkContent(chunk, metadata);
                setTimeout(() => {
                    if (chapter > 0) {
                        navigateToSpecificChapter(chunk, chapter);
                    }
                }, 100);
            }
        };

        if (metadata) {
            loadProgress();
        }
    }, [metadata]);

    const getPositionFromIndex = useCallback(
        (index: number) => {
            if (!metadata?.chunks) return { chunk: 0, chapter: 0 };

            let currentIndex = 0;
            const chunkKeys = Object.keys(metadata.chunks);

            for (let chunkIdx = 0; chunkIdx < chunkKeys.length; chunkIdx++) {
                const chapterCount = metadata.chunks[chunkKeys[chunkIdx]].length;
                if (currentIndex + chapterCount > index) {
                    return {
                        chunk: chunkIdx,
                        chapter: index - currentIndex,
                    };
                }
                currentIndex += chapterCount;
            }

            return { chunk: 0, chapter: 0 };
        },
        [metadata],
    );

    const navigateToSpecificChapter = useCallback(
        (chunkIndex: number, chapterIndex: number) => {
            if (!metadata?.chunks) return;

            const chunkKeys = Object.keys(metadata.chunks);
            const chunkKey = chunkKeys[chunkIndex];
            const chapterPath = metadata.chunks[chunkKey][chapterIndex];
            const cachedChunk = chunkCache.get(chunkIndex);

            if (cachedChunk?.has(chapterPath)) {
                setContent(cachedChunk.get(chapterPath)!);
                setCurrChunk(chunkIndex);
                setCurrChapter(chapterIndex);
            }
        },
        [metadata, chunkCache],
    );

    // gestures
    const tap = Gesture.Tap()
        .onEnd(event => {
            const { x } = event;

            const leftThird = screenWidth / 3;
            const rightThird = (screenWidth * 2) / 3;

            if (x < leftThird) {
                console.log('prev chapter');
                navigateToChapter('prev');
            } else if (x > rightThird) {
                console.log('next chapter');
                navigateToChapter('next');
            } else {
                onTapMiddle?.();
            }
        })
        .runOnJS(true);

    const swipe = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-20, 20])
        .onEnd(event => {
            if (event.velocityX > 500) {
                navigateToChapter('prev');
            } else if (event.velocityX < -500) {
                navigateToChapter('next');
            }
        })
        .runOnJS(true);

    const gestures = Gesture.Race(tap, swipe);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center">
                <ActivityIndicator size={'large'} />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center px-4">
                <Text className="text-red-500 text-center">{error}</Text>
            </SafeAreaView>
        );
    }

    return (
        <GestureDetector gesture={gestures}>
            <SafeAreaView className="flex-1">
                <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
                    <Text>{content}</Text>
                </ScrollView>
            </SafeAreaView>
        </GestureDetector>
    );
};

export default Reader;
