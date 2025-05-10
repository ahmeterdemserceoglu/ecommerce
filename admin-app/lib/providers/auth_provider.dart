import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  User? _currentUser;
  bool _isLoading = false;
  String? _error;
  bool _rememberMe = false;

  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _currentUser != null;
  bool get rememberMe => _rememberMe;
  set rememberMe(bool value) {
    _rememberMe = value;
    notifyListeners();
  }

  Future<bool> isLoggedIn({bool rememberMe = false}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final isValid = await _authService.isTokenValid(rememberMe: rememberMe);
      if (isValid) {
        _currentUser = await _authService.getCurrentUser();
      }
      _isLoading = false;
      notifyListeners();
      return isValid;
    } catch (e) {
      _isLoading = false;
      _error = 'Oturum doğrulanamadı: $e';
      notifyListeners();
      return false;
    }
  }

  Future<bool> login(String email, String password,
      {bool rememberMe = false}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentUser =
          await _authService.login(email, password, rememberMe: rememberMe);
      _isLoading = false;
      _rememberMe = rememberMe;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _error = 'Giriş başarısız: $e';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authService.logout();
      _currentUser = null;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = 'Çıkış yapılamadı: $e';
      notifyListeners();
    }
  }

  Future<bool> checkAdminAccess() async {
    return await _authService.hasAdminAccess();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
