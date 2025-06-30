package expo.module.calicoparser.epub

import android.content.Context
import android.net.Uri
import android.util.Log

class EpubParser {
    private val zip = Zip()
    private val xml = XML()
    private val normalize = Normalize()

    fun parseEpub(context: Context, uri: Uri): Map<String, Any?> {
        val cxml = zip.parseFile(context, uri, "META-INF/container.xml");
        val rootfile = xml.parseAttribute(cxml, "rootfile", "full-path");
        val rootfilecontent = zip.parseFile(context, uri, rootfile)
        val metadata = normalize.buildMetadata(context, uri, rootfilecontent)

        // throw Exception("Metadata(title=${metadata.title}, author=${metadata.author})")
        return metadata
    }

    fun chunkEpub(context: Context, uri: Uri): Map<String, List<String>> {
        val containerxml = zip.parseFile(context, uri, "META-INF/container.xml")
        val rootfile = xml.parseAttribute(containerxml, "rootfile", "full-path")
        val rootfileContent = zip.parseFile(context, uri, rootfile)
        val chunks = normalize.getChunks(context, uri, rootfileContent)
        return chunks
    }

    fun importMetadata(context: Context, uri: Uri): Map<String, Any?> {
        val containerxml = zip.parseFile(context, uri, "META-INF/container.xml")
        val rootfile = xml.parseAttribute(containerxml, "rootfile", "full-path")
        val rootfileContent = zip.parseFile(context, uri, rootfile)
        val metadata = normalize.buildMetadata(context, uri, rootfileContent)
        return metadata
    }
}
