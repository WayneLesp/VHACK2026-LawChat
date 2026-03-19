import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/app_scaffold.dart';
import '../data/history_repository.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyStreamProvider);

    return AppScaffold(
      title: 'History',
      currentIndex: 2,
      body: history.when(
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No saved history yet.'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                title: Text(item.query),
                subtitle: Text(item.timestamp?.toLocal().toString() ?? 'Pending timestamp'),
                trailing: Text(item.type.toUpperCase()),
              );
            },
            separatorBuilder: (_, __) => const Divider(),
            itemCount: items.length,
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Failed to load history: $error')),
      ),
    );
  }
}
