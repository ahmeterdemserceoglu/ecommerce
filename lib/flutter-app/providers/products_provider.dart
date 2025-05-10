import 'package:flutter/material.dart';
import '../models/product.dart';
import '../services/products_service.dart';

class ProductsProvider with ChangeNotifier {
  final ProductsService _productsService = ProductsService();
  List<Product> _products = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  final int _totalPages = 1;
  final int _limit = 10;
  String? _searchQuery;
  String? _statusFilter;

  List<Product> get products => _products;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  bool get hasNextPage => _currentPage < _totalPages;
  bool get hasPreviousPage => _currentPage > 1;

  Future<void> fetchProducts({int? limit}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _products = await _productsService.getProducts(
        page: _currentPage,
        limit: limit ?? _limit,
        status: _statusFilter,
        search: _searchQuery,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Product?> getProductById(String id) async {
    try {
      _isLoading = true;
      notifyListeners();

      final product = await _productsService.getProductById(id);

      _isLoading = false;
      notifyListeners();
      return product;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<void> approveProduct(String id) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _productsService.approveProduct(id);

      // Update product in the list
      final index = _products.indexWhere((p) => p.id == id);
      if (index != -1) {
        final updatedProduct = await _productsService.getProductById(id);
        _products[index] = updatedProduct;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> rejectProduct(String id, {String? reason}) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _productsService.rejectProduct(id, reason: reason);

      // Update product in the list
      final index = _products.indexWhere((p) => p.id == id);
      if (index != -1) {
        final updatedProduct = await _productsService.getProductById(id);
        _products[index] = updatedProduct;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> setFeatured(String id, bool isFeatured) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _productsService.setFeatured(id, isFeatured);

      // Update product in the list
      final index = _products.indexWhere((p) => p.id == id);
      if (index != -1) {
        final updatedProduct = await _productsService.getProductById(id);
        _products[index] = updatedProduct;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> getProductStats() async {
    try {
      _isLoading = true;
      notifyListeners();

      final stats = await _productsService.getProductStats();

      _isLoading = false;
      notifyListeners();
      return stats;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return {};
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
