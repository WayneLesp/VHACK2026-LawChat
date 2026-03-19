import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/firebase/firebase_providers.dart';
import '../../../core/localization/app_strings.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import 'settings_controller.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsControllerProvider);
    final user = ref.watch(firebaseAuthProvider).currentUser;

    return AppScaffold(
      title: 'Settings',
      currentIndex: 3,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(
            title: const Text('Signed in as'),
            subtitle: Text(user?.email ?? 'Unknown user'),
          ),
          DropdownButtonFormField<String>(
            value: settings.languageCode,
            decoration: const InputDecoration(labelText: 'Language'),
            items: AppStrings.languages.entries
                .map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value)))
                .toList(),
            onChanged: (value) {
              if (value != null) {
                ref.read(settingsControllerProvider.notifier).setLanguage(value);
              }
            },
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<ThemeMode>(
            value: settings.themeMode,
            decoration: const InputDecoration(labelText: 'Theme'),
            items: const [
              DropdownMenuItem(value: ThemeMode.system, child: Text('System')),
              DropdownMenuItem(value: ThemeMode.light, child: Text('Light')),
              DropdownMenuItem(value: ThemeMode.dark, child: Text('Dark')),
            ],
            onChanged: (value) {
              if (value != null) {
                ref.read(settingsControllerProvider.notifier).setThemeMode(value);
              }
            },
          ),
          SwitchListTile(
            value: settings.readingMode,
            onChanged: (value) => ref.read(settingsControllerProvider.notifier).setReadingMode(value),
            title: const Text('Reading mode'),
            subtitle: const Text('Read responses aloud and optimize answer tone.'),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}
