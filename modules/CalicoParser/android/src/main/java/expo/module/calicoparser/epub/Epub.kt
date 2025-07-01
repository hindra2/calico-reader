package expo.module.calicoparser.epub

import android.content.Context
import android.net.Uri
import android.util.Log

class EpubParser {
    private val zip = Zip()
    private val xml = XML()
    private val normalize = Normalize()

    fun parseChapter(context: Context, uri: Uri, chapterPath: String): String {
        return zip.parseFile(context, uri, chapterPath)
    }

    fun parseChunk(context: Context, uri: Uri, filePaths: List<String>): Map<String, String> {
        return zip.parseMultipleFiles(context, uri, filePaths)
    }

    fun chunkEpub(context: Context, uri: Uri): Map<String, List<String>> {
        val containerxml = zip.parseFile(context, uri, "META-INF/container.xml")
        val rootfile = xml.parseAttribute(containerxml, "rootfile", "full-path")
        val rootfileContent = zip.parseFile(context, uri, rootfile)
        val chunks = normalize.getChunks(context, uri, rootfileContent)
        return chunks
    }

    fun importMetadata(context: Context, uri: Uri): Map<String, Any?> {
        val (containerXml, rootfileContent) = zip.getBaseFiles(context, uri)

        if (containerXml == null || rootfileContent == null) {
            throw Exception("Failed to find containerxml or rootfilecontent")
        }

        val metadata = normalize.buildMetadata(rootfileContent)
        return metadata
    }

    fun cleanCache() {
        zip.clean()
    }
}
