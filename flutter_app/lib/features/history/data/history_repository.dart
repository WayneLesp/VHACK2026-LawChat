import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/firebase/firebase_providers.dart';
import '../../../core/models/history_item.dart';

class HistoryRepository {
  HistoryRepository(this._firestore, this._userId);

  final FirebaseFirestore _firestore;
  final String? _userId;

  Stream<List<HistoryItem>> watchHistory() {
    if (_userId == null) return Stream.value(const []);

    return _firestore
        .collection('history')
        .where('userId', isEqualTo: _userId)
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs.map((doc) {
            final data = doc.data();
            final timestamp = data['timestamp'];
            return HistoryItem(
              id: doc.id,
              type: data['type'] as String? ?? 'law',
              query: data['query'] as String? ?? '',
              response: data['response'] as String? ?? '',
              language: data['language'] as String?,
              timestamp: timestamp is Timestamp ? timestamp.toDate() : null,
            );
          }).toList(),
        );
  }
}

final historyRepositoryProvider = Provider<HistoryRepository>((ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return HistoryRepository(ref.watch(firestoreProvider), auth.currentUser?.uid);
});

final historyStreamProvider = StreamProvider<List<HistoryItem>>((ref) {
  return ref.watch(historyRepositoryProvider).watchHistory();
});
