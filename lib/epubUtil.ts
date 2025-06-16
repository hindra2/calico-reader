import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import * as FileSystem from 'expo-file-system';
import { Metadata } from '@/lib/epubTypes';

/**
 * Most efficient approach - read as base64 and let JSZip handle conversion
 */
export async function parseEpubMetadata(epubUri: string): Promise<Metadata> {
    try {
        console.log('Reading EPUB from URI:', epubUri);

        // Read directly as base64 - most efficient for JSZip
        const base64Content = await FileSystem.readAsStringAsync(epubUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('File read successfully, size:', base64Content.length);

        // JSZip handles base64 conversion internally - much more efficient!
        const zip = await JSZip.loadAsync(base64Content, { base64: true });
        console.log('ZIP loaded successfully');

        return await extractMetadataFromZip(zip);
    } catch (error) {
        console.error('Error parsing EPUB:', error);
        throw new Error(`Failed to parse EPUB: ${error.message}`);
    }
}

/**
 * Alternative: Check if file exists first (good for error handling)
 */
export async function parseEpubMetadataWithValidation(epubUri: string): Promise<Metadata> {
    try {
        // First check if file exists and get info
        const fileInfo = await FileSystem.getInfoAsync(epubUri);

        if (!fileInfo.exists) {
            throw new Error('EPUB file not found');
        }

        console.log('File exists, size:', fileInfo.size, 'bytes');

        // Read as base64
        const base64Content = await FileSystem.readAsStringAsync(epubUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Load with JSZip
        const zip = await JSZip.loadAsync(base64Content, { base64: true });

        return await extractMetadataFromZip(zip);
    } catch (error) {
        console.error('Error parsing EPUB with validation:', error);
        throw new Error(`Failed to parse EPUB: ${error.message}`);
    }
}

/**
 * For large files: Stream reading approach (if you need it later)
 */
export async function parseEpubMetadataStreaming(epubUri: string): Promise<Metadata> {
    try {
        // For very large files, you might want to check size first
        const fileInfo = await FileSystem.getInfoAsync(epubUri);

        if (fileInfo.size && fileInfo.size > 50 * 1024 * 1024) {
            // 50MB
            console.warn('Large EPUB file detected:', fileInfo.size, 'bytes');
            // Could implement chunked reading here if needed
        }

        // For now, still use the direct approach (works fine for most EPUBs)
        return await parseEpubMetadata(epubUri);
    } catch (error) {
        console.error('Error in streaming parse:', error);
        throw error;
    }
}

/**
 * Shared function to extract metadata from loaded ZIP
 */
async function extractMetadataFromZip(zip: JSZip): Promise<Metadata> {
    // Get container.xml to find OPF path
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
        throw new Error('Invalid EPUB: META-INF/container.xml not found');
    }

    const containerXML = await containerFile.async('string');

    // Parse container to get OPF path
    const parser = new XMLParser({ ignoreAttributes: false });
    const container = parser.parse(containerXML);
    const opfPath = container.container.rootfiles.rootfile['@_full-path'];

    console.log('OPF path found:', opfPath);

    // Get OPF file
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
        throw new Error(`OPF file not found at: ${opfPath}`);
    }

    const opfContent = await opfFile.async('string');
    const opf = parser.parse(opfContent);

    // Extract metadata
    const meta = opf.package.metadata;
    console.log('Extracted metadata:', meta);

    // Handle both single values and arrays
    const getValue = (field: any): string => {
        if (Array.isArray(field)) return field[0] || '';
        return field || '';
    };

    return {
        title: getValue(meta['dc:title']) || 'Unknown Title',
        author: getValue(meta['dc:creator']) || 'Unknown Author',
        description: getValue(meta['dc:description']) || '',
        language: getValue(meta['dc:language']) || '',
        publisher: getValue(meta['dc:publisher']) || '',
        publishedDate: getValue(meta['dc:date']) || '',
        identifier: getValue(meta['dc:identifier']) || '',
    };
}

/**
 * Utility function to check if a file is a valid EPUB
 */
export async function isValidEpubFile(epubUri: string): Promise<boolean> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(epubUri);

        if (!fileInfo.exists) {
            return false;
        }

        // Check file extension
        if (!epubUri.toLowerCase().endsWith('.epub')) {
            return false;
        }

        // Try to read as ZIP and check for required files
        const base64Content = await FileSystem.readAsStringAsync(epubUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const zip = await JSZip.loadAsync(base64Content, { base64: true });

        // Check for required EPUB files
        const hasContainer = zip.file('META-INF/container.xml') !== null;
        const hasMimetype = zip.file('mimetype') !== null;

        return hasContainer && hasMimetype;
    } catch (error) {
        console.log('File validation failed:', error);
        return false;
    }
}

/**
 * Get file information without parsing the EPUB
 */
export async function getEpubFileInfo(epubUri: string) {
    try {
        const fileInfo = await FileSystem.getInfoAsync(epubUri);

        if (!fileInfo.exists) {
            throw new Error('File not found');
        }

        // Extract filename from URI
        const filename = epubUri.split('/').pop() || 'unknown.epub';

        return {
            uri: epubUri,
            filename: decodeURIComponent(filename),
            size: fileInfo.size || 0,
            modificationTime: fileInfo.modificationTime,
            exists: fileInfo.exists,
        };
    } catch (error) {
        console.error('Error getting file info:', error);
        throw error;
    }
}

// Legacy function name for backward compatibility
export const getMetadataFromUri = parseEpubMetadata;
