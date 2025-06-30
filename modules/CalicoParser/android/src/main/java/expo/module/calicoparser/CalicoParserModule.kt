package expo.module.calicoparser

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.net.Uri

import expo.module.calicoparser.epub.EpubParser

class CalicoParserModule : Module() {
    private val epubParser = EpubParser()

    override fun definition() = ModuleDefinition {
        Name("CalicoParser")

        AsyncFunction("parseEpub") { uriString: String ->
            val context = appContext.reactContext ?: throw Exception("Context not available")
            val uri = Uri.parse(uriString)
            epubParser.parseEpub(context, uri)
        }

        AsyncFunction("importMetadata") { uriString: String ->
            val context = appContext.reactContext ?: throw Exception("Context not available")
            val uri = Uri.parse(uriString)
            epubParser.importMetadata(context, uri)

        }

        AsyncFunction("chunkEpub") { uriString: String ->
            val context = appContext.reactContext ?: throw Exception("Context not available")
            val uri = Uri.parse(uriString)
            epubParser.chunkEpub(context, uri)
        }
    }
}
