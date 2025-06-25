interface Metadata {
    key: string;
    title: string;
    author: string;
    description: string;
    coverImg?: string;
    genres: string[];
    path: string;
    chunks: ChunkMap;
}

type ChunkMap = {
    [chunkId: string]: Chapter[];
};

interface Chapter {
    id: string;
    content: string;
}

export { Metadata, Chapter };
