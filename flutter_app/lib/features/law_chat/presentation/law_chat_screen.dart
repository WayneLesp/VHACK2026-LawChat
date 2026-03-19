import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../../core/models/law_chat_models.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../settings/presentation/settings_controller.dart';
import '../data/law_chat_repository.dart';

class LawChatScreen extends ConsumerStatefulWidget {
  const LawChatScreen({super.key});

  @override
  ConsumerState<LawChatScreen> createState() => _LawChatScreenState();
}

class _LawChatScreenState extends ConsumerState<LawChatScreen> {
  final _controller = TextEditingController();
  final _speechToText = SpeechToText();
  final _tts = FlutterTts();
  final List<ChatMessage> _messages = [];
  bool _loading = false;
  ContractAnalysisResult? _contractResult;

  static const _categories = [
    'Tenancy rights',
    'Employment disputes',
    'Consumer protection',
    'Family law basics',
    'Road accidents',
    'Welfare support',
  ];

  @override
  void dispose() {
    _controller.dispose();
    _tts.stop();
    super.dispose();
  }

  Future<void> _submit([String? preset]) async {
    final query = (preset ?? _controller.text).trim();
    if (query.isEmpty) return;

    final settings = ref.read(settingsControllerProvider);
    setState(() {
      _loading = true;
      _contractResult = null;
      _messages.add(ChatMessage(role: 'user', text: query));
      _controller.clear();
    });

    try {
      final response = await ref.read(lawChatRepositoryProvider).askLaw(
            query: query,
            language: settings.languageCode,
            readingMode: settings.readingMode,
          );
      setState(() => _messages.add(ChatMessage(role: 'assistant', text: response)));
      if (settings.readingMode) {
        await _tts.speak(response);
      }
    } catch (error) {
      setState(() => _messages.add(ChatMessage(role: 'assistant', text: 'Error: $error')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _listen() async {
    final available = await _speechToText.initialize();
    if (!available) return;

    await _speechToText.listen(onResult: (result) {
      setState(() => _controller.text = result.recognizedWords);
    });
  }

  Future<void> _analyzeContract() async {
    final picked = await FilePicker.platform.pickFiles(withData: true, type: FileType.image);
    if (picked == null || picked.files.isEmpty) return;

    final file = picked.files.first;
    final bytes = file.bytes ?? Uint8List(0);
    if (bytes.isEmpty) return;

    setState(() => _loading = true);
    try {
      final settings = ref.read(settingsControllerProvider);
      final result = await ref.read(lawChatRepositoryProvider).analyzeContract(
            base64Image: fileBytesToBase64(bytes),
            mimeType: file.mimeType ?? 'image/jpeg',
            language: settings.languageCode,
          );
      setState(() => _contractResult = result);
    } catch (error) {
      setState(() => _messages.add(ChatMessage(role: 'assistant', text: 'Contract analysis failed: $error')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'LawChat',
      currentIndex: 0,
      actions: [
        IconButton(onPressed: _analyzeContract, icon: const Icon(Icons.upload_file)),
      ],
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            SizedBox(
              height: 56,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemBuilder: (context, index) {
                  final label = _categories[index];
                  return ActionChip(
                    label: Text(label),
                    onPressed: () => _submit('Tell me about $label in Malaysia.'),
                  );
                },
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemCount: _categories.length,
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                children: [
                  for (final message in _messages)
                    Card(
                      color: message.role == 'user'
                          ? Theme.of(context).colorScheme.primaryContainer
                          : Theme.of(context).colorScheme.surfaceContainerHighest,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: MarkdownBody(data: message.text),
                      ),
                    ),
                  if (_contractResult != null)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Contract analysis', style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 8),
                            for (final flag in _contractResult!.flags)
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: Icon(flag.isIllegal ? Icons.warning : Icons.info_outline),
                                title: Text(flag.clause),
                                subtitle: Text(flag.reason),
                              ),
                            MarkdownBody(data: _contractResult!.rightsSummary),
                          ],
                        ),
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
                    controller: _controller,
                    minLines: 1,
                    maxLines: 4,
                    decoration: const InputDecoration(hintText: 'Ask about your rights...'),
                  ),
                ),
                IconButton(onPressed: _listen, icon: const Icon(Icons.mic)),
                IconButton(onPressed: _loading ? null : _submit, icon: const Icon(Icons.send)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
