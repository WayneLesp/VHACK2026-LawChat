import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/firebase/firebase_providers.dart';
import '../../../core/models/document_models.dart';
import '../../../core/network/api_client.dart';

class DocumentRepository {
  DocumentRepository(this._apiClient, this._firestore, this._userId);

  final ApiClient _apiClient;
  final FirebaseFirestore _firestore;
  final String? _userId;

  Future<DocumentAnalysisResult> analyzeDocument({
    required String base64Image,
    required String mimeType,
    required String language,
  }) async {
    final payload = await _apiClient.post('/api/ai/document/explain', {
      'base64Image': base64Image,
      'mimeType': mimeType,
      'language': language,
    });

    final result = DocumentAnalysisResult.fromJson(payload);
    await _saveHistory(result.fullMarkdown ?? '', language);
    return result;
  }

  Future<String> askFollowUp({
    required String query,
    required String base64Image,
    required String mimeType,
    required String language,
    required bool readingMode,
    required List<Map<String, dynamic>> history,
  }) async {
    final payload = await _apiClient.post('/api/ai/document/chat', {
      'query': query,
      'base64Image': base64Image,
      'mimeType': mimeType,
      'language': language,
      'readingMode': readingMode,
      'history': history,
    });
    return payload['response'] as String? ?? '';
  }

  Future<void> _saveHistory(String response, String language) async {
    if (_userId == null) return;

    await _firestore.collection('history').add({
      'userId': _userId,
      'type': 'doc',
      'query': 'Document Analysis',
      'response': response,
      'language': language,
      'timestamp': FieldValue.serverTimestamp(),
    });
  }
}

final documentRepositoryProvider = Provider<DocumentRepository>((ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return DocumentRepository(
    ApiClient(),
    ref.watch(firestoreProvider),
    auth.currentUser?.uid,
  );
});
