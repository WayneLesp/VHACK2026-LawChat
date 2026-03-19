class ChatMessage {
  const ChatMessage({required this.role, required this.text});

  final String role;
  final String text;
}

class ContractFlag {
  const ContractFlag({
    required this.clause,
    required this.reason,
    required this.isIllegal,
  });

  final String clause;
  final String reason;
  final bool isIllegal;

  factory ContractFlag.fromJson(Map<String, dynamic> json) {
    return ContractFlag(
      clause: json['clause'] as String? ?? '',
      reason: json['reason'] as String? ?? '',
      isIllegal: json['isIllegal'] as bool? ?? false,
    );
  }
}

class ContractAnalysisResult {
  const ContractAnalysisResult({required this.flags, required this.rightsSummary});

  final List<ContractFlag> flags;
  final String rightsSummary;

  factory ContractAnalysisResult.fromJson(Map<String, dynamic> json) {
    final flags = (json['flags'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ContractFlag.fromJson)
        .toList();

    return ContractAnalysisResult(
      flags: flags,
      rightsSummary: json['rightsSummary'] as String? ?? '',
    );
  }
}
