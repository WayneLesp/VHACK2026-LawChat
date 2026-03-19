# LawChat Mobile (Flutter)

This directory contains a native Flutter rewrite scaffold for LawChat.

## Planned stack
- Flutter + Riverpod
- go_router navigation
- Firebase Auth + Cloud Firestore
- Backend-mediated AI requests via the Express server in the repo root
- speech_to_text + flutter_tts for accessibility features

## Next steps
1. Install Flutter SDK locally.
2. Run `flutter create .` inside this directory if you want platform folders generated.
3. Configure Firebase for Android/iOS.
4. Point `AppConfig.apiBaseUrl` to your deployed backend.
5. Run `flutter pub get` and then `flutter run`.
