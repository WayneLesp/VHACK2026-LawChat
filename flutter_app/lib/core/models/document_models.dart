class DocumentAnalysisResult {
  const DocumentAnalysisResult({
    this.detectedLanguage,
    this.summary,
    this.keyPoints,
    this.actionSuggestions,
    this.terminology,
    this.fullMarkdown,
  });

  final String? detectedLanguage;
  final String? summary;
  final String? keyPoints;
  final String? actionSuggestions;
  final String? terminology;
  final String? fullMarkdown;

  factory DocumentAnalysisResult.fromJson(Map<String, dynamic> json) {
    return DocumentAnalysisResult(
      detectedLanguage: json['detectedLanguage'] as String?,
      summary: json['summary'] as String?,
      keyPoints: json['keyPoints'] as String?,
      actionSuggestions: json['actionSuggestions'] as String?,
      terminology: json['terminology'] as String?,
      fullMarkdown: json['fullMarkdown'] as String?,
    );
  }
}
