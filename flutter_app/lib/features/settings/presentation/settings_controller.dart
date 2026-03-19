import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsState {
  const SettingsState({
    required this.languageCode,
    required this.themeMode,
    required this.readingMode,
  });

  final String languageCode;
  final ThemeMode themeMode;
  final bool readingMode;

  SettingsState copyWith({
    String? languageCode,
    ThemeMode? themeMode,
    bool? readingMode,
  }) {
    return SettingsState(
      languageCode: languageCode ?? this.languageCode,
      themeMode: themeMode ?? this.themeMode,
      readingMode: readingMode ?? this.readingMode,
    );
  }
}

class SettingsController extends StateNotifier<SettingsState> {
  SettingsController()
      : super(const SettingsState(
          languageCode: 'en',
          themeMode: ThemeMode.system,
          readingMode: false,
        )) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final themeName = prefs.getString('themeMode') ?? 'system';
    state = state.copyWith(
      languageCode: prefs.getString('languageCode') ?? 'en',
      readingMode: prefs.getBool('readingMode') ?? false,
      themeMode: switch (themeName) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      },
    );
  }

  Future<void> setLanguage(String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('languageCode', value);
    state = state.copyWith(languageCode: value);
  }

  Future<void> setThemeMode(ThemeMode value) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = switch (value) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };
    await prefs.setString('themeMode', encoded);
    state = state.copyWith(themeMode: value);
  }

  Future<void> setReadingMode(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('readingMode', value);
    state = state.copyWith(readingMode: value);
  }
}

final settingsControllerProvider = StateNotifierProvider<SettingsController, SettingsState>((ref) {
  return SettingsController();
});
