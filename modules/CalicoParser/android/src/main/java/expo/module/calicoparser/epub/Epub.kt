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
        val metadata = normalize.buildMetadata(rootfilecontent)

        // throw Exception("Metadata(title=${metadata.title}, author=${metadata.author})")
        return metadata
    }
}
