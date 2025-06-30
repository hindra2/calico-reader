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
    [chunkId: string]: string;
};

export { Metadata };
