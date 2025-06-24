package expo.module.calicoparser.epub

import android.content.Context
import android.net.Uri
import org.json.JSONObject
import org.json.JSONArray

class EpubParser {
    private val zip = Zip()

    fun parseEpub(context: Context, uri: Uri): String {
        val result = zip.findContainerXml(context, uri);
        return result
    }
}
