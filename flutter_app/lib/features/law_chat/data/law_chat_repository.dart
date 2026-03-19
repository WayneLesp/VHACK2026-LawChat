import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/firebase/firebase_providers.dart';
import '../../../core/models/law_chat_models.dart';
import '../../../core/network/api_client.dart';

class LawChatRepository {
  LawChatRepository(this._apiClient, this._firestore, this._userId);

  final ApiClient _apiClient;
  final FirebaseFirestore _firestore;
  final String? _userId;

  Future<String> askLaw({
    required String query,
    required String language,
    required bool readingMode,
  }) async {
    final payload = await _apiClient.post('/api/ai/law-chat', {
      'query': query,
      'language': language,
      'readingMode': readingMode,
    });

    final response = payload['response'] as String? ?? '';
    await _saveHistory(type: 'law', query: query, response: response, language: language);
    return response;
  }

  Future<ContractAnalysisResult> analyzeContract({
    required String base64Image,
    required String mimeType,
    required String language,
  }) async {
    final payload = await _apiClient.post('/api/ai/contract/analyze', {
      'base64Image': base64Image,
      'mimeType': mimeType,
      'language': language,
    });

    return ContractAnalysisResult.fromJson(payload);
  }

  Future<void> _saveHistory({
    required String type,
    required String query,
    required String response,
    required String language,
  }) async {
    if (_userId == null) return;

    await _firestore.collection('history').add({
      'userId': _userId,
      'type': type,
      'query': query,
      'response': response,
      'language': language,
      'timestamp': FieldValue.serverTimestamp(),
    });
  }
}

final lawChatRepositoryProvider = Provider<LawChatRepository>((ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return LawChatRepository(
    ApiClient(),
    ref.watch(firestoreProvider),
    auth.currentUser?.uid,
  );
});

String fileBytesToBase64(List<int> bytes) => base64Encode(bytes);
