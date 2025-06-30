package expo.module.calicoparser.epub

import android.content.Context
import android.net.Uri
import java.util.zip.ZipInputStream
import java.util.zip.ZipEntry
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.StringReader
import android.util.Log

const val MAX_CHUNK_SIZE = 100 * 1024

class Zip {
    fun parseFile(context: Context, uri: Uri, file: String): String {
        try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                ZipInputStream(inputStream).use { zipInputStream ->
                    var entry: ZipEntry? = zipInputStream.nextEntry
                    while (entry != null) {
                        val entryName = entry.name

                        if (entryName == file) {
                            return readEntry(zipInputStream)
                        }
                        zipInputStream.closeEntry()

                        entry = zipInputStream.nextEntry
                    }
                }
            }
        } catch (e: Exception) {
            throw Exception("Failed to parse file: ${e.message}")
        }
        return ""
    }

    fun readEntry(zipInputStream: ZipInputStream): String {
        return zipInputStream.bufferedReader().use { it.readText() }
    }
}

class XML {
    fun parseAttribute(xml: String, tag: String, attr: String): String {
        var factory = XmlPullParserFactory.newInstance()
        var parser = factory.newPullParser()
        parser.setInput(StringReader(xml))

        var eventType = parser.eventType
        while (eventType != XmlPullParser.END_DOCUMENT) {
            if (eventType == XmlPullParser.START_TAG && parser.name == tag) {
                for (i in 0 until parser.attributeCount) {
                    if (parser.getAttributeName(i) == attr) {
                        return parser.getAttributeValue(i)
                    }
                }
            }
            eventType = parser.next()
        }
        throw Exception("<$tag> with attribute $attr not found")
    }

    fun parseContent(xml: String, tag: String): String {
        val factory = XmlPullParserFactory.newInstance()
        val parser = factory.newPullParser()
        parser.setInput(StringReader(xml))

        var eventType = parser.eventType
        while (eventType != XmlPullParser.END_DOCUMENT) {
            if (eventType == XmlPullParser.START_TAG && parser.name == tag) {
                return parser.nextText()
            }
            eventType = parser.next()
        }
        throw Exception("Tag <$tag> not found in XML")
    }

    fun parseAllContent(xml: String, tag: String): List<String> {
        val results = mutableListOf<String>();

        val factory = XmlPullParserFactory.newInstance()
        val parser = factory.newPullParser()
        parser.setInput(StringReader(xml))

        var eventType = parser.eventType
        while (eventType != XmlPullParser.END_DOCUMENT) {
            if (eventType == XmlPullParser.START_TAG && parser.name == tag) {
                results.add(parser.nextText())
            }

            eventType = parser.next()
        }

        return results
    }
}

class Normalize {
    private val xml = XML()
    private val zip = Zip()

    fun buildMetadata(context: Context, uri: Uri, rootfileOpf: String): Map<String, Any?> {
        val title = xml.parseContent(rootfileOpf, "dc:title")
        val author = xml.parseContent(rootfileOpf, "dc:creator")
        val description = try {
            xml.parseContent(rootfileOpf, "dc:description")
        } catch (e: Exception) {
            null
        }
        val genres = try {
            xml.parseAllContent(rootfileOpf, "dc:subject")
        } catch (e: Exception) {
            null
        }

        return mapOf(
            "title" to title,
            "author" to author,
            "description" to description,
            "genres" to genres
        )
    }

    fun getChunks(context: Context, uri: Uri, rootfileOpf: String): Map<String, List<String>> {
        val chapterPaths = extractSpineChapters(rootfileOpf)
        val entrySizes = getAllEntrySizes(context, uri)
        val chunks = chunkChapters(chapterPaths, entrySizes)

        return chunks
    }

    fun extractSpineChapters(opf: String): List<String> {
        val chapterMap = mutableMapOf<String, String>()
        val spineIds = mutableListOf<String>()

        val factory = XmlPullParserFactory.newInstance()
        val parser = factory.newPullParser()
        parser.setInput(StringReader(opf))

        var eventType = parser.eventType
        while (eventType != XmlPullParser.END_DOCUMENT) {
            if (eventType == XmlPullParser.START_TAG) {
                when (parser.name) {
                    "item" -> {
                        val id = parser.getAttributeValue(null, "id")
                        val href = parser.getAttributeValue(null, "href")
                        if (id != null && href != null) {
                            chapterMap[id] = href
                        }
                    }

                    "itemref" -> {
                        val idref = parser.getAttributeValue(null, "idref")
                        if (idref != null) {
                            spineIds.add(idref)
                        }
                    }
                }
            }
            eventType = parser.next()
        }

        return spineIds.mapNotNull { chapterMap[it] }
    }

     fun chunkChapters(chapterPaths: List<String>, entrySizes: Map<String, Int>): Map<String, List<String>> {
        val chunkedChapters = LinkedHashMap<String, List<String>>()
        var currChunk = mutableListOf<String>()
        var currSize = 0
        var chunkIndex = 0

        for (path in chapterPaths) {
            val size = entrySizes[path] ?: 0

            if (currSize + size > MAX_CHUNK_SIZE && currChunk.isNotEmpty()) {
                chunkedChapters["chunk$chunkIndex"] = currChunk
                chunkIndex++
                currChunk = mutableListOf()
                currSize = 0
            }

            currChunk.add(path)
            currSize += size
        }

        if (currChunk.isNotEmpty()) {
            chunkedChapters["chunk$chunkIndex"] = currChunk
        }

        return chunkedChapters
    }

    fun getAllEntrySizes(context: Context, uri: Uri): Map<String, Int> {
        val result = mutableMapOf<String, Int>()
        context.contentResolver.openInputStream(uri)?.use { inputStream ->
            ZipInputStream(inputStream).use { zipInputStream ->
                var entry: ZipEntry? = zipInputStream.nextEntry
                while (entry != null) {
                    val name = entry.name
                    val size = if (entry.size >= 0) {
                        entry.size.toInt()
                    } else {
                        val content = zipInputStream.readBytes()
                        content.size
                    }
                    result[name] = size
                    zipInputStream.closeEntry()
                    entry = zipInputStream.nextEntry
                }
            }
        }
        return result
    }
}
