import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/localization/app_strings.dart';
import '../core/theme/app_theme.dart';
import '../features/settings/presentation/settings_controller.dart';
import 'router.dart';

class LawChatMobileApp extends ConsumerWidget {
  const LawChatMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsControllerProvider);
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'LawChat Mobile',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: settings.themeMode,
      routerConfig: router,
      locale: Locale(settings.languageCode),
      supportedLocales: AppStrings.supportedLocales,
    );
  }
}
