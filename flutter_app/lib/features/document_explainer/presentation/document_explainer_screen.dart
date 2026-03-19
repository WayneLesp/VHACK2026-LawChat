import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../../core/models/document_models.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../settings/presentation/settings_controller.dart';
import '../data/document_repository.dart';

class DocumentExplainerScreen extends ConsumerStatefulWidget {
  const DocumentExplainerScreen({super.key});

  @override
  ConsumerState<DocumentExplainerScreen> createState() => _DocumentExplainerScreenState();
}

class _DocumentExplainerScreenState extends ConsumerState<DocumentExplainerScreen> {
  final _chatController = TextEditingController();
  final _speechToText = SpeechToText();
  final _tts = FlutterTts();
  final List<Map<String, dynamic>> _history = [];
  DocumentAnalysisResult? _result;
  String? _base64Image;
  String _mimeType = 'image/jpeg';
  bool _loading = false;

  @override
  void dispose() {
    _chatController.dispose();
    _tts.stop();
    super.dispose();
  }

  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    await _analyze(bytes, 'image/jpeg');
  }

  Future<void> _pickFromCamera() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.camera);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    await _analyze(bytes, 'image/jpeg');
  }

  Future<void> _pickFile() async {
    final picked = await FilePicker.platform.pickFiles(withData: true, type: FileType.custom, allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png']);
    if (picked == null || picked.files.isEmpty) return;
    final file = picked.files.first;
    final bytes = file.bytes ?? Uint8List(0);
    if (bytes.isEmpty) return;
    await _analyze(bytes, file.mimeType ?? 'application/octet-stream');
  }

  Future<void> _analyze(Uint8List bytes, String mimeType) async {
    setState(() {
      _loading = true;
      _base64Image = base64Encode(bytes);
      _mimeType = mimeType;
      _history.clear();
    });

    try {
      final settings = ref.read(settingsControllerProvider);
      final result = await ref.read(documentRepositoryProvider).analyzeDocument(
            base64Image: _base64Image!,
            mimeType: mimeType,
            language: settings.languageCode,
          );
      setState(() => _result = result);
      if (settings.readingMode && result.fullMarkdown != null) {
        await _tts.speak(result.fullMarkdown!);
      }
    } catch (error) {
      setState(() {
        _result = DocumentAnalysisResult(fullMarkdown: 'Analysis failed: $error');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _askFollowUp() async {
    final query = _chatController.text.trim();
    if (query.isEmpty || _base64Image == null) return;

    final settings = ref.read(settingsControllerProvider);
    setState(() {
      _loading = true;
      _history.add({'role': 'user', 'parts': [{'text': query}]});
      _chatController.clear();
    });

    try {
      final response = await ref.read(documentRepositoryProvider).askFollowUp(
            query: query,
            base64Image: _base64Image!,
            mimeType: _mimeType,
            language: settings.languageCode,
            readingMode: settings.readingMode,
            history: _history,
          );
      setState(() => _history.add({'role': 'model', 'parts': [{'text': response}]}));
      if (settings.readingMode) {
        await _tts.speak(response);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _listen() async {
    final available = await _speechToText.initialize();
    if (!available) return;
    await _speechToText.listen(onResult: (result) {
      setState(() => _chatController.text = result.recognizedWords);
    });
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Documents',
      currentIndex: 1,
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(onPressed: _pickFromCamera, icon: const Icon(Icons.camera_alt), label: const Text('Camera')),
                FilledButton.icon(onPressed: _pickFromGallery, icon: const Icon(Icons.image), label: const Text('Gallery')),
                OutlinedButton.icon(onPressed: _pickFile, icon: const Icon(Icons.attach_file), label: const Text('File')),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                children: [
                  if (_result?.fullMarkdown != null)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: MarkdownBody(data: _result!.fullMarkdown!),
                      ),
                    ),
                  for (final item in _history)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: MarkdownBody(data: item['parts'][0]['text'] as String? ?? ''),
                      ),
                    ),
                  if (_loading) const Center(child: CircularProgressIndicator()),
                ],
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _chatController,
                    minLines: 1,
                    maxLines: 4,
                    decoration: const InputDecoration(hintText: 'Ask about this document...'),
                  ),
                ),
                IconButton(onPressed: _listen, icon: const Icon(Icons.mic)),
                IconButton(onPressed: _askFollowUp, icon: const Icon(Icons.send)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
