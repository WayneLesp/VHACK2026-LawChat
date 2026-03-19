class HistoryItem {
  const HistoryItem({
    required this.id,
    required this.type,
    required this.query,
    required this.response,
    this.language,
    this.timestamp,
  });

  final String id;
  final String type;
  final String query;
  final String response;
  final String? language;
  final DateTime? timestamp;

  factory HistoryItem.fromJson(String id, Map<String, dynamic> json) {
    return HistoryItem(
      id: id,
      type: json['type'] as String? ?? 'law',
      query: json['query'] as String? ?? '',
      response: json['response'] as String? ?? '',
      language: json['language'] as String?,
      timestamp: json['timestamp'] is DateTime ? json['timestamp'] as DateTime : null,
    );
  }
}
