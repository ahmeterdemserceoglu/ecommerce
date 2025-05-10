import 'package:flutter/material.dart';
import '../services/database_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class DatabaseProvider with ChangeNotifier {
  final DatabaseService _databaseService = DatabaseService();
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic> _healthStats = {};
  bool _isInitialized = false;
  List<String> _queryHistory = [];
  static const String _queryHistoryKey = 'sql_query_history';
  static const int _maxHistorySize = 50;

  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic> get healthStats => _healthStats;
  bool get isInitialized => _isInitialized;
  List<String> get queryHistory => _queryHistory;

  // Constructor to load query history when provider is initialized
  DatabaseProvider() {
    _loadQueryHistory();
  }

  // Load query history from persistent storage
  Future<void> _loadQueryHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final historyJson = prefs.getString(_queryHistoryKey);
      if (historyJson != null) {
        final decoded = jsonDecode(historyJson);
        _queryHistory = List<String>.from(decoded);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error loading query history: $e');
    }
  }

  // Save query to history
  Future<void> _saveQueryToHistory(String query) async {
    try {
      // Don't add duplicate of the most recent query
      if (_queryHistory.isNotEmpty && _queryHistory.first == query) {
        return;
      }

      // Add to memory
      _queryHistory.insert(0, query);

      // Trim history to max size
      if (_queryHistory.length > _maxHistorySize) {
        _queryHistory = _queryHistory.sublist(0, _maxHistorySize);
      }

      // Save to persistent storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_queryHistoryKey, jsonEncode(_queryHistory));

      notifyListeners();
    } catch (e) {
      debugPrint('Error saving query history: $e');
    }
  }

  // Clear query history
  Future<void> clearQueryHistory() async {
    try {
      _queryHistory.clear();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_queryHistoryKey);
      notifyListeners();
    } catch (e) {
      debugPrint('Error clearing query history: $e');
    }
  }

  // Initialize the database
  Future<bool> initializeDatabase() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _databaseService.initializeDatabase();
      _isInitialized = result;
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Execute a SQL query
  Future<Map<String, dynamic>> executeQuery(String sql) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _databaseService.executeQuery(sql);
      // Save successful query to history
      if (!result.containsKey('error') || result['error'] == null) {
        _saveQueryToHistory(sql);
      }
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return {'error': e.toString()};
    }
  }

  // Update database schema
  Future<bool> updateDatabaseSchema() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _databaseService.updateDatabaseSchema();
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Update database functions
  Future<bool> updateDatabaseFunctions() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _databaseService.updateDatabaseFunctions();
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Check database health
  Future<void> checkDatabaseHealth() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _healthStats = await _databaseService.checkDatabaseHealth();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      _healthStats = {};
      notifyListeners();
    }
  }

  // Backup database
  Future<String?> backupDatabase() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _databaseService.backupDatabase();
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
