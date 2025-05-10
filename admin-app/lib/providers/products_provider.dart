import 'package:flutter/material.dart';
import '../models/product.dart';
import '../services/api_service.dart';

class ProductsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<Product> _products = [];
  Product? _selectedProduct;
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  int _totalPages = 1;
  final int _defaultLimit = 10;
  String? _searchQuery;
  String? _statusFilter;
  String? _categoryIdFilter;

  List<Product> get products => _products;
  Product? get selectedProduct => _selectedProduct;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  bool get hasNextPage => _currentPage < _totalPages;
  bool get hasPreviousPage => _currentPage > 1;

  Future<void> fetchProducts({
    int page = 1,
    bool forceRefresh = false,
    int? explicitLimit,
  }) async {
    if (_isLoading && !forceRefresh) return;
    if (page == _currentPage &&
        _products.isNotEmpty &&
        !forceRefresh &&
        explicitLimit == null) return;

    _isLoading = true;
    if (page == 1 || forceRefresh) {
      _products = [];
      _currentPage = 1;
    }
    _error = null;
    notifyListeners();

    try {
      final int currentLimit = explicitLimit ?? _defaultLimit;
      notifyListeners();

      final fetchedProducts = await _apiService.fetchProducts(
        page: page,
        limit: currentLimit,
        searchTerm: _searchQuery,
        status: _statusFilter,
        categoryId: _categoryIdFilter,
      );

      if (page == 1 || forceRefresh) {
        _products = fetchedProducts;
      } else {
        _products.addAll(fetchedProducts);
      }
      _currentPage = page;

      if (explicitLimit == null) {
        if (fetchedProducts.length < currentLimit) {
          _totalPages = _currentPage;
        } else {
          _totalPages = _currentPage + 1;
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProductById(String id) async {
    _isLoading = true;
    _error = null;
    _selectedProduct = null;
    notifyListeners();
    try {
      _selectedProduct = await _apiService.fetchProductById(id);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createProduct(Product product) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final newProduct = await _apiService.createProduct(product);
      _products.insert(0, newProduct);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateProduct(Product product) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final updatedProduct = await _apiService.updateProduct(product);
      final index = _products.indexWhere((p) => p.id == updatedProduct.id);
      if (index != -1) {
        _products[index] = updatedProduct;
      }
      if (_selectedProduct?.id == updatedProduct.id) {
        _selectedProduct = updatedProduct;
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteProduct(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await _apiService.deleteProduct(id);
      _products.removeWhere((p) => p.id == id);
      if (_selectedProduct?.id == id) {
        _selectedProduct = null;
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> approveProduct(String id) async {
    final index = _products.indexWhere((p) => p.id == id);
    if (index != -1 && _products[index].status != 'approved') {
      await fetchProducts(page: _currentPage, forceRefresh: true);
      notifyListeners();
      return true;
    }
    return false;
  }

  void setSearchQuery(String? query) {
    _searchQuery = query;
    fetchProducts(page: 1, forceRefresh: true);
  }

  void setStatusFilter(String? status) {
    _statusFilter = status;
    fetchProducts(page: 1, forceRefresh: true);
  }

  void setCategoryFilter(String? categoryId) {
    _categoryIdFilter = categoryId;
    fetchProducts(page: 1, forceRefresh: true);
  }

  void clearFilters() {
    _searchQuery = null;
    _statusFilter = null;
    _categoryIdFilter = null;
    fetchProducts(page: 1, forceRefresh: true);
  }

  void loadNextPage() {
    if (hasNextPage && !_isLoading) {
      fetchProducts(page: _currentPage + 1);
    }
  }

  void loadPreviousPage() {
    if (hasPreviousPage && !_isLoading) {
      fetchProducts(page: _currentPage - 1);
    }
  }

  Future<Map<String, dynamic>> getProductStats() async {
    return {};
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
