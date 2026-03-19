import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/auth_gate.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/document_explainer/presentation/document_explainer_screen.dart';
import '../features/history/presentation/history_screen.dart';
import '../features/law_chat/presentation/law_chat_screen.dart';
import '../features/settings/presentation/settings_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/law',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => AuthGate(child: child),
        routes: [
          GoRoute(
            path: '/law',
            builder: (context, state) => const LawChatScreen(),
          ),
          GoRoute(
            path: '/documents',
            builder: (context, state) => const DocumentExplainerScreen(),
          ),
          GoRoute(
            path: '/history',
            builder: (context, state) => const HistoryScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
    ],
  );
});
