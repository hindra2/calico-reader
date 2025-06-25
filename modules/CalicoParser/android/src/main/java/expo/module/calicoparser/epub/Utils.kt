package expo.module.calicoparser.epub

import android.content.Context
import android.net.Uri
import java.util.zip.ZipInputStream
import java.util.zip.ZipEntry
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.StringReader
import android.util.Log

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

    fun buildMetadata(opf: String): Map<String, Any?> {
        val title = xml.parseContent(opf, "dc:title")
        val author = xml.parseContent(opf, "dc:creator")
        val description = try {
            xml.parseContent(opf, "dc:description")
        } catch (e: Exception) {
            null
        }
        val genres = try {
            xml.parseAllContent(opf, "dc:subject")
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
}
