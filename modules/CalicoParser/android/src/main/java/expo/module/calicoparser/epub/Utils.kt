package expo.module.calicoparser.epub

import android.content.Context
import android.net.Uri
import java.util.zip.ZipInputStream
import java.util.zip.ZipEntry

class Zip {
    fun findContainerXml(context: Context, uri: Uri): String {
        try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                ZipInputStream(inputStream).use { zipInputStream ->
                    var entry: ZipEntry? = zipInputStream.nextEntry
                    while (entry != null) {
                        val entryName = entry.name

                        if (entryName == "META-INF/container.xml") {
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

    private fun readEntry(zipInputStream: ZipInputStream): String {
        return zipInputStream.bufferedReader().use { it.readText() }
    }
}
