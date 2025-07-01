interface Metadata {
    key: string;
    title: string;
    author: string;
    description: string;
    coverImg?: string;
    genres: string[];
    path: string;
    chunks: Record<string, string[]>;
}

export { Metadata };
